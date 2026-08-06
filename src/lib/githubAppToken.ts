const OIDC_AUDIENCE = "texra-github-action";
const TOKEN_EXCHANGE_URL =
  "https://remote.texra.ai/functions/v1/github-app-token-exchange";

interface TokenExchangeResponse {
  token?: unknown;
  app_token?: unknown;
  error?: unknown;
}

type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ResolveGitHubTokenOptions {
  providedToken: string;
  getIdToken(audience: string): Promise<string>;
  fetchImpl: Fetch;
  exchangeUrl?: string;
}

/** Resolve an explicit override or exchange GitHub Actions OIDC for the TeXRA App token. */
export async function resolveGitHubToken(
  options: ResolveGitHubTokenOptions,
): Promise<string> {
  if (options.providedToken) return options.providedToken;

  let oidcToken: string;
  try {
    oidcToken = await options.getIdToken(OIDC_AUDIENCE);
  } catch (cause) {
    throw new Error(
      "Could not request a GitHub Actions OIDC token. Add `id-token: write` to the job permissions.",
      { cause },
    );
  }

  const response = await options.fetchImpl(
    options.exchangeUrl ?? TOKEN_EXCHANGE_URL,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${oidcToken}` },
    },
  );

  let body: TokenExchangeResponse = {};
  try {
    body = (await response.json()) as TokenExchangeResponse;
  } catch {
    // The status remains the useful diagnostic for a non-JSON gateway error.
  }

  if (!response.ok) {
    const detail = typeof body.error === "string" ? `: ${body.error}` : "";
    throw new Error(
      `TeXRA GitHub App token exchange failed (${response.status})${detail}`,
    );
  }

  let token = "";
  if (typeof body.token === "string") {
    token = body.token;
  } else if (typeof body.app_token === "string") {
    token = body.app_token;
  }
  if (!token) {
    throw new Error(
      "TeXRA GitHub App token exchange returned no installation token",
    );
  }
  return token;
}
