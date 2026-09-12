import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createCreatorTable, creatorDatabasePath, importCreators } from "../src/lib/creator-db";

async function main() {
  const csv = await readFile(path.join(process.cwd(), "dummy_creators.csv"), "utf8");
  await mkdir(path.dirname(creatorDatabasePath), { recursive: true });
  const db = new DatabaseSync(creatorDatabasePath);
  try {
    createCreatorTable(db);
    const count = importCreators(db, csv);
    console.log(`SQLite 준비 완료: 크리에이터 ${count}명 적재 (동일 ID는 갱신, CSV 원본 유지)`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("SQLite 초기화 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
