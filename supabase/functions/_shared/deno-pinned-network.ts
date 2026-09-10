interface DenoNetAddress {
  readonly hostname: string
}

interface DenoDnsAddress {
  readonly address: string
  readonly family: "ipv4" | "ipv6"
}

interface DenoDnsAdapter {
  resolve(
    hostname: string,
    signal: AbortSignal
  ): Promise<readonly DenoDnsAddress[]>
}

interface DenoNetworkConnection {
  readonly readable: ReadableStream<Uint8Array>
  readonly remoteAddress: string
  readonly writable: WritableStream<Uint8Array>
  close(): void
}

interface DenoPinnedConnectionRequest {
  readonly ipAddress: string
  readonly port: number
  readonly signal: AbortSignal
  readonly tlsServerName: string | null
}

interface DenoConnectionAdapter {
  open(request: DenoPinnedConnectionRequest): Promise<DenoNetworkConnection>
}

interface DenoTcpConnection {
  readonly readable: ReadableStream<Uint8Array>
  readonly remoteAddr: DenoNetAddress
  readonly writable: WritableStream<Uint8Array>
  close(): void
}

export interface DenoNetworkRuntime {
  connect(options: {
    hostname: string
    port: number
    transport: "tcp"
  }): Promise<DenoTcpConnection>
  resolveDns(
    hostname: string,
    recordType: "A" | "AAAA",
    options: { signal: AbortSignal }
  ): Promise<string[]>
  startTls(
    connection: DenoTcpConnection,
    options: {
      alpnProtocols: ["http/1.1"]
      hostname: string
    }
  ): Promise<DenoTcpConnection>
}

export const requireDenoPinningRuntime = (
  value: unknown
): DenoNetworkRuntime => {
  if (typeof value !== "object" || value === null) {
    throw new Error("The worker runtime cannot pin remote destinations.")
  }
  const runtime = value as Partial<DenoNetworkRuntime>
  if (
    typeof runtime.connect !== "function" ||
    typeof runtime.resolveDns !== "function" ||
    typeof runtime.startTls !== "function"
  ) {
    throw new Error("The worker runtime cannot pin remote destinations.")
  }
  return runtime as DenoNetworkRuntime
}

const closeQuietly = (connection: DenoTcpConnection): void => {
  try {
    connection.close()
  } catch {
    // The runtime may have consumed the TCP handle while starting TLS.
  }
}

const closeAfterAbort = <Connection extends DenoTcpConnection>(
  connectionPromise: Promise<Connection>,
  signal: AbortSignal
): Promise<Connection> => {
  if (signal.aborted) {
    void connectionPromise.then(
      (connection) => closeQuietly(connection),
      () => {}
    )
    return Promise.reject(
      new DOMException("The operation was aborted.", "AbortError")
    )
  }

  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      void connectionPromise.then(
        (connection) => closeQuietly(connection),
        () => {}
      )
      reject(new DOMException("The operation was aborted.", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    void connectionPromise.then(
      (connection) => {
        signal.removeEventListener("abort", onAbort)
        if (signal.aborted) {
          closeQuietly(connection)
          reject(new DOMException("The operation was aborted.", "AbortError"))
          return
        }
        resolve(connection)
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort)
        reject(error)
      }
    )
  })
}

const wrapConnection = (
  connection: DenoTcpConnection,
  signal: AbortSignal
): DenoNetworkConnection => {
  let closed = false
  const onAbort = (): void => {
    if (!closed) closeQuietly(connection)
    closed = true
  }
  signal.addEventListener("abort", onAbort, { once: true })

  return {
    close: () => {
      signal.removeEventListener("abort", onAbort)
      if (!closed) closeQuietly(connection)
      closed = true
    },
    readable: connection.readable,
    remoteAddress: connection.remoteAddr.hostname,
    writable: connection.writable,
  }
}

export const createDenoDnsAdapter = (
  runtime: DenoNetworkRuntime
): DenoDnsAdapter => ({
  resolve: async (hostname, signal) => {
    const results = await Promise.allSettled([
      runtime.resolveDns(hostname, "A", { signal }),
      runtime.resolveDns(hostname, "AAAA", { signal }),
    ])
    if (signal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError")
    }

    const addresses = []
    const [ipv4Result, ipv6Result] = results
    if (ipv4Result.status === "fulfilled") {
      for (const address of ipv4Result.value) {
        addresses.push({ address, family: "ipv4" as const })
      }
    }
    if (ipv6Result.status === "fulfilled") {
      for (const address of ipv6Result.value) {
        addresses.push({ address, family: "ipv6" as const })
      }
    }
    if (
      addresses.length === 0 &&
      results.every((result) => result.status === "rejected")
    ) {
      throw new Error("DNS resolution failed.")
    }
    return addresses
  },
})

export const createDenoPinnedConnectionAdapter = (
  runtime: DenoNetworkRuntime
): DenoConnectionAdapter => ({
  open: async (request: DenoPinnedConnectionRequest) => {
    const tcpConnection = await closeAfterAbort(
      runtime.connect({
        hostname: request.ipAddress,
        port: request.port,
        transport: "tcp",
      }),
      request.signal
    )

    if (request.tlsServerName === null) {
      return wrapConnection(tcpConnection, request.signal)
    }

    let tlsConnection: DenoTcpConnection
    try {
      tlsConnection = await closeAfterAbort(
        runtime.startTls(tcpConnection, {
          alpnProtocols: ["http/1.1"],
          hostname: request.tlsServerName,
        }),
        request.signal
      )
    } catch (error) {
      closeQuietly(tcpConnection)
      throw error
    }
    return wrapConnection(tlsConnection, request.signal)
  },
})
