// Parse-validates the migration against the real Postgres grammar (libpg_query,
// via pgsql-parser). Catches syntax errors, unbalanced parens, unterminated
// $$ bodies and malformed statements.
//
// It does NOT do semantic validation: a call to a function that does not exist
// parses perfectly well and would still fail on the server. That class of bug
// has to be caught by review, not by the parser.
const fs = require("fs");
const path = require("path");
const { parse, loadModule } = require("pgsql-parser");

const file = process.argv[2] || "supabase/migrations/0001_init.sql";
const sql = fs.readFileSync(path.resolve(file), "utf8");

(async () => {
  // The grammar ships as WASM, so it has to be instantiated before first use.
  await loadModule();

  let result;
  try {
    result = await parse(sql);
  } catch (e) {
    console.log(`PARSE FAIL  ${file}`);
    console.log(
      String(e.message || e)
        .split("\n")
        .slice(0, 15)
        .map((l) => "  " + l)
        .join("\n"),
    );
    process.exit(1);
  }

  const stmts = result.parse_tree || result.stmts || [];
  console.log(`PARSE OK    ${file}`);
  console.log(`statements  ${stmts.length}`);

  // Tally what the file actually creates, so the summary is read off the
  // migration rather than remembered.
  const tally = {};
  const bump = (k) => (tally[k] = (tally[k] || 0) + 1);

  // Statements arrive wrapped as { stmt, stmt_location, stmt_len }; unwrap so
  // the counters below key off the real node types.
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (node.CreateStmt) bump(`table   ${node.CreateStmt.relation?.relname}`);
    if (node.CreateFunctionStmt) {
      // funcname is [{ String: { sval } }, ...], schema first.
      const name = node.CreateFunctionStmt.funcname
        ?.map((p) => p.String?.sval)
        .filter(Boolean)
        .join(".");
      bump(`func    ${name}`);
    }
    if (node.CreatePolicyStmt) bump("policy");
    if (node.CreateTrigStmt) bump("trigger");
    if (node.IndexStmt) bump("index");
    if (node.AlterTableStmt) bump("alter table");
    if (node.TransactionStmt) {
      const k = node.TransactionStmt.kind;
      bump(
        `txn     ${
          k === "TRANS_STMT_BEGIN"
            ? "begin"
            : k === "TRANS_STMT_COMMIT"
              ? "commit"
              : "rollback"
        }`,
      );
    }
    for (const k of Object.keys(node)) walk(node[k]);
  };
  walk(stmts);

  for (const [k, v] of Object.entries(tally).sort()) {
    console.log(`  ${String(v).padStart(2)}  ${k}`);
  }
})();