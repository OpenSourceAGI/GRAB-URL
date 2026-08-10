/**
 * @file core/auth.ts
 * @description Resolves the token for a security scheme and prefixes it for
 * the declared HTTP auth scheme. Ported from Hey API's client core (MIT).
 */

import type { Auth, AuthToken } from "../types";

/**
 * Resolves the configured auth value for one security scheme.
 *
 * @param auth - Security scheme from the OpenAPI spec.
 * @param callback - Token, or a function returning one for the scheme.
 * @returns The header/query value to send, or undefined when there is no token.
 */
export const getAuthToken = async (
  auth: Auth,
  callback: ((auth: Auth) => Promise<AuthToken> | AuthToken) | AuthToken,
): Promise<string | undefined> => {
  const token = typeof callback === "function" ? await callback(auth) : callback;

  if (!token) return;
  if (auth.scheme === "bearer") return `Bearer ${token}`;
  if (auth.scheme === "basic") return `Basic ${btoa(token)}`;

  return token;
};
