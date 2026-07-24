const assert = require("node:assert/strict");
const { parseExplain, parseIndexes } = require("../parser");

const plan = `-> Aggregate: count(0)  (cost=38.4..38.4 rows=1) (actual time=0.743..0.743 rows=1 loops=1)
    -> Table scan on tt1  (cost=32.3..32.8 rows=56.2) (actual time=0.708..0.733 rows=59 loops=1)
        -> Filter: ((crm_subject_follow_bill.tenant_id = 1) and (crm_subject_follow_bill.\`type\` = 1))  (cost=2.86 rows=1.1) (actual time=0.0249..0.0821 rows=11 loops=1)
            -> Index lookup on crm_subject_follow_bill using 主体id (service_subject_id=202501022435769582)  (cost=2.86 rows=11) (actual time=0.0217..0.0758 rows=11 loops=1)`;

const schema = `CREATE TABLE crm_subject_follow_bill (
  id bigint NOT NULL,
  service_subject_id bigint NOT NULL,
  tenant_id bigint NOT NULL,
  type int NOT NULL,
  KEY 主体id (service_subject_id, tenant_id, type)
)`;

const parsed = parseExplain(plan);
assert.equal(parsed.roots.length, 1);
assert.equal(parsed.nodes.length, 4);
assert.equal(parsed.nodes[0].actualStart, 0.743);
assert.equal(parsed.nodes[0].actualEnd, 0.743);
assert.equal(parsed.roots[0].children[0].children[0].children[0].index, "主体id");
assert.equal(parsed.nodes[3].table, "crm_subject_follow_bill");
assert.deepEqual(parsed.nodes[3].lookupColumns, ["service_subject_id"]);
assert.equal(parsed.nodes[2].condition.includes("tenant_id"), true);

const indexes = parseIndexes(schema);
assert.deepEqual(indexes.get("crm_subject_follow_bill::主体id").columns, [
  "service_subject_id",
  "tenant_id",
  "type",
]);

const rootWithoutArrow = parseExplain(
  "Aggregate: count(distinct concat(ca.account_date,'-',ca.service_subject_id))",
);

assert.equal(rootWithoutArrow.roots.length, 1);
assert.equal(rootWithoutArrow.nodes[0].operation, "Aggregate");
assert.equal(rootWithoutArrow.nodes[0].actualStart, null);
assert.equal(rootWithoutArrow.nodes[0].actualEnd, null);

const zeroStart = parseExplain("-> Aggregate: count(0)  (cost=10 rows=1) (actual time=0..10 rows=1 loops=1)");
assert.equal(zeroStart.nodes[0].actualStart, 0);
assert.equal(zeroStart.nodes[0].actualEnd, 10);

const exponentTime = parseExplain(
  "-> Single-row index lookup on fs using PRIMARY (id=o.fin_subject_id)  (cost=0.381 rows=1) (actual time=730e-6..751e-6 rows=0.958 loops=59834)",
);
assert.equal(exponentTime.nodes[0].actualStart, 0.00073);
assert.equal(exponentTime.nodes[0].actualEnd, 0.000751);
assert.equal(exponentTime.nodes[0].actualRows, 0.958);
assert.equal(exponentTime.nodes[0].loops, 59834);

console.log("parser tests passed");
