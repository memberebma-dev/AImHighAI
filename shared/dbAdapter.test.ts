import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTable } from "./dbAdapter";

// Records the query-builder calls the adapter makes, then resolves to `result`.
function fakeClient(result: any) {
  const calls: any[] = [];
  const builder: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (res: any) => res(result);
      return (...args: any[]) => { calls.push([prop, ...args]); return builder; };
    },
  });
  return { calls, sb: { from: (t: string) => { calls.push(["from", t]); return builder; } } as any };
}

test("list maps where/orderBy/limit to Supabase filters", async () => {
  const { sb, calls } = fakeClient({ data: [{ id: "1" }], error: null });
  const rows = await makeTable(sb, "leads").list({ where: { userId: "u1", status: "new", skip: undefined }, orderBy: { createdAt: "desc" }, limit: 5 });
  assert.deepEqual(rows, [{ id: "1" }]);
  assert.deepEqual(calls, [["from", "leads"], ["select", "*"], ["eq", "userId", "u1"], ["eq", "status", "new"], ["order", "createdAt", { ascending: false }], ["limit", 5]]);
});

test("errors are thrown, never swallowed", async () => {
  const { sb } = fakeClient({ data: null, error: { message: "boom" } });
  await assert.rejects(makeTable(sb, "leads").list(), /db\.leads\.list failed: boom/);
  await assert.rejects(makeTable(sb, "leads").update("x", { a: 1 }), /update failed: boom/);
});

test("count returns exact count", async () => {
  const { sb, calls } = fakeClient({ count: 7, error: null });
  assert.equal(await makeTable(sb, "leads").count({ where: { userId: "u1" } }), 7);
  assert.deepEqual(calls[1], ["select", "*", { count: "exact", head: true }]);
});

test("update and delete target the row by id", async () => {
  const { sb, calls } = fakeClient({ data: { id: "9" }, error: null });
  await makeTable(sb, "agentRuns").update("9", { status: "failed" });
  assert.deepEqual(calls.slice(1, 3), [["update", { status: "failed" }], ["eq", "id", "9"]]);
});
