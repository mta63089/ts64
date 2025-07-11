import { beforeEach, describe, expect, test } from "vitest";
import { CPU } from "./cpu";

describe("Full program execution", () => {
  let cpu: CPU;

  beforeEach(() => {
    cpu = new CPU();
    cpu.memory[0xfffc] = 0x00;
    cpu.memory[0xfffd] = 0x80; // Start at 0x8000

    const program = new Uint8Array([
      0xa9,
      0x03, // LDA #$03
      0x69,
      0x05, // ADC #$05
      0x8d,
      0x00,
      0x60, // STA $6000
    ]);
    cpu.memory.set(program, 0x8000);
    cpu.reset();
  });

  test("executes program correctly", () => {
    cpu.step(); // LDA #$03
    cpu.step(); // ADC #$05
    cpu.step(); // STA $6000

    expect(cpu.A).toBe(0x08);
    expect(cpu.memory[0x6000]).toBe(0x08);
  });

  test("BEQ branches when zero flag is set", () => {
    cpu.memory.set(
      [
        0xa9,
        0x00, // LDA #$00
        0xf0,
        0x02, // BEQ +2 (to STA)
        0xa9,
        0x01, // LDA #$01 (should be skipped)
        0x8d,
        0x00,
        0x60, // STA $6000
      ],
      0x8000
    );

    cpu.reset();
    cpu.step(); // LDA
    cpu.step(); // BEQ (taken)
    cpu.step(); // STA

    expect(cpu.A).toBe(0x00);
    expect(cpu.memory[0x6000]).toBe(0x00);
  });

  test("Loop: decrement X until zero", () => {
    cpu.memory.set(
      [
        0xa2,
        0x03, // LDX #$03
        0xca, // DEX
        0xd0,
        0xfd, // BNE -3 (to DEX)
        0x8e,
        0x00,
        0x60, // STX $6000
      ],
      0x8000
    );

    cpu.reset();
    for (let i = 0; i < 6; i++) cpu.step();

    expect(cpu.X).toBe(0x00);
    expect(cpu.memory[0x6000]).toBe(0x00);
  });

  test("JSR and RTS jump into and out of subroutine", () => {
    cpu.memory.set(
      [
        0x20,
        0x06,
        0x80, // JSR $8006
        0x8d,
        0x00,
        0x60, // STA $6000 (should store 0x42)
        0xa9,
        0x42, // LDA #$42
        0x60, // RTS
      ],
      0x8000
    );

    cpu.reset();
    cpu.step(); // JSR
    cpu.step(); // LDA in subroutine
    cpu.step(); // RTS
    cpu.step(); // STA $6000

    expect(cpu.A).toBe(0x42);
    expect(cpu.memory[0x6000]).toBe(0x42);
  });

  test("PHA and PLA push/pull accumulator via stack", () => {
    cpu.memory.set(
      [
        0xa9,
        0xab, // LDA #$AB
        0x48, // PHA
        0xa9,
        0x00, // LDA #$00
        0x68, // PLA
      ],
      0x8000
    );

    cpu.reset();
    cpu.step(); // LDA #$AB
    cpu.step(); // PHA
    cpu.step(); // LDA #$00
    cpu.step(); // PLA

    expect(cpu.A).toBe(0xab);
  });
});
