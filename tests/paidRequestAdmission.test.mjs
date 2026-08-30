import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPaidRequestAdmission,
  createPaidRequestLeaseRegistry,
  DEFAULT_PAID_REQUEST_ADMISSION,
  paidProviderJobStatusIsTerminal,
} from "../lib/paidRequestAdmission.ts";

describe("process-local paid request admission", () => {
  it("shares the production default across duplicate module instances in one realm", async () => {
    const duplicatedModule = await import(
      "../lib/paidRequestAdmission.ts?duplicate-module-instance"
    );

    assert.equal(
      duplicatedModule.DEFAULT_PAID_REQUEST_ADMISSION,
      DEFAULT_PAID_REQUEST_ADMISSION,
    );
  });

  it("rejects above the concurrency ceiling without queueing or consuming rate", () => {
    let currentTime = 1_000;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 2,
      maxStartsPerWindow: 3,
      windowMs: 1_000,
      now: () => currentTime,
    });

    const first = admission.tryAcquire();
    const second = admission.tryAcquire();
    const rejected = admission.tryAcquire();
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.deepEqual(rejected, {
      ok: false,
      reason: "concurrency_limit",
      retryAfterSeconds: 1,
    });

    first.release();
    const third = admission.tryAcquire();
    assert.equal(third.ok, true);
    assert.deepEqual(admission.stats(), {
      active: 2,
      maxConcurrent: 2,
      maxStartsPerWindow: 3,
      startsInWindow: 3,
      windowMs: 1_000,
    });

    second.release();
    third.release();
    currentTime += 1;
    assert.equal(admission.stats().active, 0);
  });

  it("enforces the start window and recovers exactly after expiry", () => {
    let currentTime = 5_000;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 5,
      maxStartsPerWindow: 2,
      windowMs: 1_000,
      now: () => currentTime,
    });

    const first = admission.tryAcquire();
    const second = admission.tryAcquire();
    first.release();
    second.release();
    assert.deepEqual(admission.tryAcquire(), {
      ok: false,
      reason: "rate_limit",
      retryAfterSeconds: 1,
    });

    currentTime = 6_001;
    const recovered = admission.tryAcquire();
    assert.equal(recovered.ok, true);
    recovered.release();
  });

  it("makes permit release idempotent", () => {
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 2,
      windowMs: 1_000,
    });
    const permit = admission.tryAcquire();
    assert.equal(permit.ok, true);

    permit.release();
    permit.release();
    assert.equal(admission.stats().active, 0);
  });

  it("retains a background permit until explicit release or lease expiry", () => {
    let currentTime = 10_000;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 2,
      maxStartsPerWindow: 10,
      now: () => currentTime,
    });
    const leases = createPaidRequestLeaseRegistry({
      admission,
      namespace: "explicit-expiry",
      now: () => currentTime,
    });
    const explicit = admission.tryAcquire();
    assert.equal(explicit.ok, true);
    assert.equal(leases.track("job-explicit", 11_000, explicit), true);
    assert.equal(admission.stats().active, 1);
    assert.deepEqual(leases.stats(), { activeLeases: 1 });

    assert.equal(leases.release("job-explicit"), true);
    assert.equal(leases.release("job-explicit"), false);
    assert.equal(admission.stats().active, 0);

    const expiring = admission.tryAcquire();
    assert.equal(expiring.ok, true);
    assert.equal(leases.track("job-expiring", 11_000, expiring), true);
    currentTime = 10_999;
    leases.sweep();
    assert.equal(admission.stats().active, 1);
    currentTime = 11_000;
    leases.sweep();
    assert.equal(admission.stats().active, 0);
    assert.deepEqual(leases.stats(), { activeLeases: 0 });
  });

  it("prunes every expired job before a different route acquires capacity", () => {
    let currentTime = 1_000;
    const admission = createPaidRequestAdmission({
      maxConcurrent: 1,
      maxStartsPerWindow: 10,
      now: () => currentTime,
    });
    const ownerRegistry = createPaidRequestLeaseRegistry({
      admission,
      namespace: "owner-route",
      now: () => currentTime,
    });
    const owner = admission.tryAcquire();
    assert.equal(owner.ok, true);
    assert.equal(ownerRegistry.track("job", 2_000, owner), true);

    currentTime = 2_000;
    const crossRoute = admission.tryAcquire();
    assert.equal(crossRoute.ok, true);
    assert.equal(admission.stats().active, 1);
    crossRoute.release();
    assert.equal(ownerRegistry.stats().activeLeases, 0);
  });

  it("releases rejected duplicate and invalid leases without disturbing the owner", () => {
    const admission = createPaidRequestAdmission({
      maxConcurrent: 4,
      maxStartsPerWindow: 10,
      now: () => 20_000,
    });
    const leases = createPaidRequestLeaseRegistry({
      admission,
      namespace: "invalid-leases",
      now: () => 20_000,
    });
    const owner = admission.tryAcquire();
    const duplicate = admission.tryAcquire();
    const expired = admission.tryAcquire();
    const blank = admission.tryAcquire();
    assert.equal(owner.ok && duplicate.ok && expired.ok && blank.ok, true);

    assert.equal(leases.track("job", 21_000, owner), true);
    assert.equal(leases.track("job", 21_000, duplicate), false);
    assert.equal(leases.track("expired", 20_000, expired), false);
    assert.equal(leases.track(" ", 21_000, blank), false);
    assert.equal(admission.stats().active, 1);
    assert.deepEqual(leases.stats(), { activeLeases: 1 });

    assert.equal(leases.release("job"), true);
    assert.equal(admission.stats().active, 0);
  });

  it("recognizes only provider terminal states that release background leases", () => {
    for (const status of ["cancelled", "completed", "failed", "incomplete"]) {
      assert.equal(paidProviderJobStatusIsTerminal(status), true);
    }
    for (const status of ["queued", "in_progress", "unknown", "", null]) {
      assert.equal(paidProviderJobStatusIsTerminal(status), false);
    }
  });
});
