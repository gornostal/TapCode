const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 2025;
const MAX_PORT = 65535;

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ServerConfig {
  host: string;
  port: number;
  basicAuth: BasicAuthConfig | null;
}

export function resolveServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const host = env.TAPCODE_HOST?.trim() || DEFAULT_HOST;

  const portValue = env.TAPCODE_PORT?.trim();
  let port = DEFAULT_PORT;
  if (portValue) {
    const parsedPort = Number.parseInt(portValue, 10);
    if (
      Number.isNaN(parsedPort) ||
      parsedPort < 0 ||
      !Number.isInteger(parsedPort) ||
      parsedPort > MAX_PORT
    ) {
      throw new Error(
        `Invalid TAPCODE_PORT value: "${portValue}". Expected an integer between 0 and ${MAX_PORT}.`,
      );
    }
    port = parsedPort;
  }

  const basicAuthValue = env.TAPCODE_BASIC_AUTH?.trim();
  let basicAuth: BasicAuthConfig | null = null;
  if (basicAuthValue) {
    const separatorIndex = basicAuthValue.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(
        'Invalid TAPCODE_BASIC_AUTH value. Expected format "username:password".',
      );
    }
    const username = basicAuthValue.slice(0, separatorIndex);
    const password = basicAuthValue.slice(separatorIndex + 1);
    if (!username || !password) {
      throw new Error(
        "Invalid TAPCODE_BASIC_AUTH value. Username and password must both be provided.",
      );
    }
    basicAuth = { username, password };
  }

  return { host, port, basicAuth };
}
