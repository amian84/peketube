import { describe, expect, it } from "vitest";
import {
  describeOAuthUserId,
  stableOAuthUserId,
} from "@/lib/auth/oauth-user-id";

describe("stableOAuthUserId", () => {
  it("prefiere providerAccountId de Google", () => {
    const id = stableOAuthUserId(
      {
        provider: "google",
        type: "oauth",
        providerAccountId: "117234567890123456789",
        access_token: "x",
        token_type: "bearer",
      },
      { sub: "117234567890123456789" },
      { id: "8b13515d-4223-4046-872f-ea75d8ba437a", email: "a@b.com" },
      "8b13515d-4223-4046-872f-ea75d8ba437a",
    );
    expect(id).toBe("117234567890123456789");
  });

  it("describe google sub vs uuid", () => {
    expect(describeOAuthUserId("117234567890123456789")).toBe("google-sub");
    expect(describeOAuthUserId("8b13515d-4223-4046-872f-ea75d8ba437a")).toBe(
      "uuid",
    );
  });

  it("no usa user.id UUID de Auth.js si falta providerAccountId", () => {
    const id = stableOAuthUserId(
      null,
      undefined,
      { id: "8b13515d-4223-4046-872f-ea75d8ba437a", email: "a@b.com" },
      "8b13515d-4223-4046-872f-ea75d8ba437a",
    );
    expect(id).toBeNull();
  });
});
