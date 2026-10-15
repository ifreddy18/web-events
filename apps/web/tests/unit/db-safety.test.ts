import { describe, expect, it } from "vitest"
import {
  assertSafeDevDatabaseUrl,
  assertSafeTestDatabaseUrl,
} from "../support/db-safety"

const url = (db: string, host = "localhost") => `postgresql://user@${host}:5432/${db}?schema=public`

describe("assertSafeTestDatabaseUrl", () => {
  it("accepts local events_test", () => {
    expect(assertSafeTestDatabaseUrl(url("events_test"))).toBe(url("events_test"))
    expect(() => assertSafeTestDatabaseUrl(url("events_test", "127.0.0.1"))).not.toThrow()
  })

  it.each([
    ["missing url", undefined],
    ["garbage", "not a url"],
    ["non-postgres", "mysql://u@localhost/events_test"],
    ["events_dev", url("events_dev")],
    ["accounting dev", url("accounting_system_dev")],
    ["accounting test", url("accounting_system_test")],
    ["similar name", url("events_test2")],
    ["wrong case", url("Events_Test")],
    ["remote host", url("events_test", "db.example.com")],
    ["supabase host", url("events_test", "db.abc.supabase.co")],
    ["supabase pooler", "postgresql://u@aws-0.pooler.supabase.com:6543/events_test"],
    ["host override param", "postgresql://u@localhost/events_test?host=db.example.com"],
    ["no database", "postgresql://u@localhost:5432"],
  ])("rejects %s", (_name, value) => {
    expect(() => assertSafeTestDatabaseUrl(value)).toThrow(/Unsafe database target/)
  })
})

describe("assertSafeDevDatabaseUrl", () => {
  it("accepts local events_dev only", () => {
    expect(() => assertSafeDevDatabaseUrl(url("events_dev"))).not.toThrow()
    expect(() => assertSafeDevDatabaseUrl(url("events_test"))).toThrow()
    expect(() => assertSafeDevDatabaseUrl(url("events_dev", "db.supabase.co"))).toThrow()
    expect(() => assertSafeDevDatabaseUrl(url("accounting_system_dev"))).toThrow()
    expect(() => assertSafeDevDatabaseUrl(url("events_dev", "10.0.0.5"))).toThrow()
  })
})
