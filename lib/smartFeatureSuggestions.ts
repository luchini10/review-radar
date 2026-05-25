import { z } from "zod";
import type { SmartFeatureResponse } from "@/types/smart-features";

export const fallbackFeatures: SmartFeatureResponse = {
  category: "general product",
  features: [
    {
      name: "Price",
      description: "The total cost and whether it fits the user's budget.",
      examples: ["Budget", "Mid-range", "Premium"],
    },
    {
      name: "Durability",
      description: "How well the product holds up with normal use over time.",
      examples: ["Heavy-duty", "Long-lasting", "Scratch-resistant"],
    },
    {
      name: "Size",
      description: "Physical size, capacity, dimensions, or fit.",
      examples: ["Compact", "Standard", "Large"],
    },
    {
      name: "Ease of use",
      description: "How simple the product is to use, clean, install, or maintain.",
      examples: ["Easy setup", "Low maintenance", "Beginner-friendly"],
    },
    {
      name: "Warranty",
      description:
        "Warranty length, return policy, and customer support reputation.",
      examples: ["1-year warranty", "Easy returns", "Good support"],
    },
  ],
};

export const smartFeatureResponseSchema = z
  .object({
    category: z.string().min(1),
    features: z
      .array(
        z
          .object({
            name: z.string().min(1).max(40),
            description: z.string().min(1).max(180),
            examples: z.array(z.string().min(1).max(40)).min(2).max(5),
          })
          .strict(),
      )
      .min(5)
      .max(10),
  })
  .strict();

const featureJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
    },
    description: {
      type: "string",
    },
    examples: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "string",
      },
    },
  },
  required: ["name", "description", "examples"],
} as const;

export const smartFeatureResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
    },
    features: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: featureJsonSchema,
    },
  },
  required: ["category", "features"],
} as const;
