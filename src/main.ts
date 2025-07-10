import { setupCounter } from "./counter.ts";
import "./style.css";

import { CPU } from "./core/cpu";

const cpu = new CPU();

// Manually place a test program into memory
// Program:
// LDA #$42 (0xA9 0x42) → Load 66 into accumulator
// NOP         (0xEA)   → No operation
cpu.memory[0xfffc] = 0x00; // Reset vector low byte (where CPU starts)
cpu.memory[0xfffd] = 0x80; // Reset vector high byte → 0x8000

cpu.memory[0x8000] = 0xa9; // LDA
cpu.memory[0x8001] = 0x42;
cpu.memory[0x8002] = 0xea; // NOP

cpu.reset(); // Sets PC to 0x8000

for (let i = 0; i < 2; i++) {
  console.log(`STEP ${i + 1}:`);
  cpu.step();
  console.log(`  A = ${cpu.A.toString(16)}`);
  console.log(`  PC = ${cpu.PC.toString(16)}`);
  console.log("---");
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Commodore-64 Typescript</h1>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
