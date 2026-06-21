import type { Collection, Document, MongoClient } from "mongodb"

const databaseName = "agentvault"
const mongoRetryDelayMs = 30_000
const mongoOperationTimeoutMs = 1500

const globalMongo = globalThis as typeof globalThis & {
  __agentvaultMongoClient?: Promise<MongoClient>
  __agentvaultMongoRetryAt?: number
}

async function getMongoClient() {
  const uri = process.env.MONGODB_URI
  if (!uri) return null

  if (globalMongo.__agentvaultMongoRetryAt && globalMongo.__agentvaultMongoRetryAt > Date.now()) {
    return null
  }

  if (!globalMongo.__agentvaultMongoClient) {
    globalMongo.__agentvaultMongoClient = import("mongodb")
      .then(({ MongoClient }) =>
        new MongoClient(uri, {
          connectTimeoutMS: 2500,
          serverSelectionTimeoutMS: 2500,
        }).connect(),
      )
      .catch((error) => {
        delete globalMongo.__agentvaultMongoClient
        globalMongo.__agentvaultMongoRetryAt = Date.now() + mongoRetryDelayMs
        throw error
      })
  }

  return globalMongo.__agentvaultMongoClient
}

async function getMongoClientWithTimeout() {
  const clientPromise = getMongoClient()
  if (!clientPromise) return null

  let timeout: ReturnType<typeof setTimeout> | undefined
  const timedOut = Symbol("mongo-timeout")

  const client = await Promise.race([
    clientPromise,
    new Promise<typeof timedOut>((resolve) => {
      timeout = setTimeout(() => resolve(timedOut), mongoOperationTimeoutMs)
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })

  if (client === timedOut) {
    delete globalMongo.__agentvaultMongoClient
    globalMongo.__agentvaultMongoRetryAt = Date.now() + mongoRetryDelayMs
    return null
  }

  return client
}

export async function getMongoCollection<T extends Document>(collectionName: string): Promise<Collection<T> | null> {
  const client = await getMongoClientWithTimeout().catch(() => null)
  if (!client) return null
  return client.db(databaseName).collection<T>(collectionName)
}
