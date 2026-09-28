import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";
import { extract } from "./index";

async function readStreamToBuffer(stream: NodeJS.ReadStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main() {
  const options = {
    out: { type: "string" as const, short: "o" },
    folder: { type: "string" as const, short: "d", default: "" },
    help: { type: "boolean" as const, short: "h" },
  };

  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options,
    allowPositionals: true,
  });

  if (values.help) {
    console.error("Usage: extract [archive-file] [options]");
    console.error("If [archive-file] is omitted, reads from stdin.");
    console.error("Options:");
    console.error(
      "  -o, --out <dir>         Output directory. If absent, outputs to stdout (only works if 1 file).",
    );
    console.error("  -d, --folder <dir>      Folder to extract from archive.");
    process.exit(0);
  }

  let archiveBuffer: Buffer;
  let filename: string | undefined;

  if (positionals.length > 0) {
    archiveBuffer = fs.readFileSync(path.resolve(positionals[0]));
    filename = path.basename(positionals[0]);
  } else {
    if (process.stdin.isTTY) {
      console.error(
        "Error: Must provide an archive file or pipe input via stdin.",
      );
      process.exit(1);
    }
    archiveBuffer = await readStreamToBuffer(process.stdin);
  }

  const arrayBuf = archiveBuffer.buffer.slice(
    archiveBuffer.byteOffset,
    archiveBuffer.byteOffset + archiveBuffer.byteLength,
  ) as ArrayBuffer;

  const files = await extract({
    archiveBuffer: arrayBuf,
    folderPath: values.folder,
    filename,
  });

  if (values.out) {
    for (const file of files) {
      const outPath = path.join(values.out, file.path);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      let buf: Buffer;
      if (file.content.match(/^[A-Za-z0-9+/=]+$/) && file.content.length > 50) {
        try {
          buf = Buffer.from(file.content, "base64");
        } catch {
          buf = Buffer.from(file.content, "utf8");
        }
      } else {
        buf = Buffer.from(file.content, "utf8");
      }
      fs.writeFileSync(outPath, buf);
    }
    console.error("Extracted " + files.length + " files to " + values.out);
  } else {
    if (files.length === 1) {
      let buf: Buffer;
      if (
        files[0].content.match(/^[A-Za-z0-9+/=]*$/) &&
        files[0].content.length > 50
      ) {
        buf = Buffer.from(files[0].content, "base64");
      } else {
        buf = Buffer.from(files[0].content, "utf8");
      }
      process.stdout.write(buf);
    } else {
      console.error(
        "Archive contains " +
          files.length +
          " files. Please specify -o/--out directory to extract them.",
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Extract Error:", err);
  process.exit(1);
});
