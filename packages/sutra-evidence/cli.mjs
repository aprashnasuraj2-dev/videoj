#!/usr/bin/env node
import fs from 'node:fs';
import { validateReceipt } from './index.js';
const [receiptFile,catalogFile,...extra] = process.argv.slice(2);
if (!receiptFile || extra.length) {
  console.error('Usage: node cli.mjs RECEIPT.json [SOURCES.json]'); process.exitCode=2;
} else {
  try {
    const read = file => {
      const data = fs.readFileSync(file);
      if (data.length > 2 * 1024 * 1024) throw new Error('size');
      return JSON.parse(data.toString('utf8'));
    };
    const result=validateReceipt(read(receiptFile), catalogFile ? {sources:read(catalogFile)} : {});
    console.log(JSON.stringify(result,null,2)); process.exitCode=result.valid ? 0 : 1;
  } catch {
    console.error('Unable to read bounded JSON input. Check file permissions, JSON syntax and the 2 MiB limit.'); process.exitCode=2;
  }
}
