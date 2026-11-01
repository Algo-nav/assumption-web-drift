import { test, expect } from "@playwright/test";
import { clientIp, normaliseIp } from "../app/lib/client-ip.js";

const key = (xff) => clientIp(new Headers(xff === undefined ? {} : { "x-forwarded-for": xff }));

test.describe("IPv6 is keyed by its /64", () => {
  test("different interface IDs inside one /64 share a key", () => {
    const a = key("2001:db8:1:2::1");
    expect(a).toBe("2001:db8:1:2::/64");
    expect(key("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe(a);
    expect(key("2001:db8:1:2:ffff:ffff:ffff:ffff")).toBe(a);
  });

  test("a different /64 gets a different key", () => {
    expect(key("2001:db8:1:3::1")).not.toBe(key("2001:db8:1:2::1"));
    expect(key("2001:db8:2:2::1")).not.toBe(key("2001:db8:1:2::1"));
    // the 4th group is the last one inside the /64; the 5th is outside it
    expect(key("2001:db8:1:2:1::")).toBe(key("2001:db8:1:2::"));
  });

  test("every spelling of the same address gives one key", () => {
    const want = "2001:db8:0:0::/64";
    for (const s of [
      "2001:db8::1",
      "2001:0db8:0000:0000:0000:0000:0000:0001",
      "2001:DB8::1",
      "[2001:db8::1]",
      "[2001:db8::1]:443",
      "2001:db8::1%eth0",
      " 2001:db8::1 ",
      "2001:db8:0:0:0:0:0:1",
    ]) {
      expect(key(s), s).toBe(want);
    }
  });

  test("compression at the edges expands correctly", () => {
    expect(key("::1")).toBe("0:0:0:0::/64");
    expect(key("::")).toBe("0:0:0:0::/64");
    expect(key("1::")).toBe("1:0:0:0::/64");
    expect(key("1:2:3:4:5:6:7::")).toBe("1:2:3:4::/64");
    expect(key("::5:6:7:8")).toBe("0:0:0:0::/64");
    expect(key("1:2::7:8")).toBe("1:2:0:0::/64");
    expect(key("fe80::1ff:fe23:4567:890a")).toBe("fe80:0:0:0::/64");
  });

  test("IPv4-mapped IPv6 is the IPv4 address", () => {
    expect(key("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(key("::ffff:cb00:7107")).toBe("203.0.113.7");
    expect(key("0:0:0:0:0:ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(key("::ffff:203.0.113.7")).toBe(key("203.0.113.7"));
  });

  test("an IPv4 tail on a non-mapped address still lands in its /64", () => {
    expect(key("2001:db8::198.51.100.1")).toBe("2001:db8:0:0::/64");
  });
});

test.describe("everything else is unchanged", () => {
  test("IPv4 is used as sent", () => {
    expect(key("203.0.113.9")).toBe("203.0.113.9");
    expect(key("1.2.3.4, 203.0.113.9")).toBe("203.0.113.9");
  });

  test("the last entry wins when several are present, IPv6 included", () => {
    expect(key("203.0.113.9, 2001:db8:1:2::77")).toBe("2001:db8:1:2::/64");
    expect(key("2001:db8:1:2::77, 203.0.113.9")).toBe("203.0.113.9");
  });

  test("missing, empty or blank header is the 'unknown' bucket", () => {
    expect(key(undefined)).toBe("unknown");
    expect(key("")).toBe("unknown");
    expect(key("   ")).toBe("unknown");
    expect(key("1.2.3.4, ")).toBe("unknown");
  });

  test("non-IP text passes through, capped at 64 characters", () => {
    expect(key("not-an-ip")).toBe("not-an-ip");
    expect(normaliseIp("x".repeat(100))).toHaveLength(64);
    // not valid IPv6, so it is not treated as a /64
    expect(key("2001:db8:::1")).toBe("2001:db8:::1");
    expect(key("12345::1")).toBe("12345::1");
  });
});
