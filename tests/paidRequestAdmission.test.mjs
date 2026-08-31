import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPaidRequestAdmission,
  DEFAULT_PAID_REQUEST_ADMISSION,
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

});
