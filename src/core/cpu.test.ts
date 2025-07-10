import { beforeEach, describe, expect, test } from "vitest";
import { CPU } from "./cpu";

describe("6502 CPU", () => {
  let cpu: CPU;

  beforeEach(() => {
    cpu = new CPU();
    cpu.memory[0xfffc] = 0x00; // Reset vector low
    cpu.memory[0xfffd] = 0x80; // Reset vector high
    cpu.reset();
  });
  const officialOpcodes = [
    "00",
    "01",
    "05",
    "06",
    "08",
    "09",
    "0A",
    "0D",
    "0E",
    "10",
    "11",
    "15",
    "16",
    "18",
    "19",
    "1D",
    "1E",
    "20",
    "21",
    "24",
    "25",
    "26",
    "28",
    "29",
    "2A",
    "2C",
    "2D",
    "2E",
    "30",
    "31",
    "35",
    "36",
    "38",
    "39",
    "3D",
    "3E",
    "40",
    "41",
    "45",
    "46",
    "48",
    "49",
    "4A",
    "4C",
    "4D",
    "4E",
    "50",
    "51",
    "55",
    "56",
    "58",
    "59",
    "5D",
    "5E",
    "60",
    "61",
    "65",
    "66",
    "68",
    "69",
    "6A",
    "6C",
    "6D",
    "6E",
    "70",
    "71",
    "75",
    "76",
    "78",
    "79",
    "7D",
    "7E",
    "81",
    "84",
    "85",
    "86",
    "88",
    "8A",
    "8C",
    "8D",
    "8E",
    "90",
    "91",
    "94",
    "95",
    "96",
    "98",
    "99",
    "9A",
    "9D",
    "A0",
    "A1",
    "A2",
    "A4",
    "A5",
    "A6",
    "A8",
    "A9",
    "AA",
    "AC",
    "AD",
    "AE",
    "B0",
    "B1",
    "B4",
    "B5",
    "B6",
    "B8",
    "B9",
    "BA",
    "BC",
    "BD",
    "BE",
    "C0",
    "C1",
    "C4",
    "C5",
    "C6",
    "C8",
    "C9",
    "CA",
    "CC",
    "CD",
    "CE",
    "D0",
    "D1",
    "D5",
    "D6",
    "D8",
    "D9",
    "DD",
    "DE",
    "E0",
    "E1",
    "E4",
    "E5",
    "E6",
    "E8",
    "E9",
    "EA",
    "EC",
    "ED",
    "EE",
    "F0",
    "F1",
    "F5",
    "F6",
    "F8",
    "F9",
    "FD",
    "FE",
  ].map((hex) => parseInt(hex, 16));

  describe("CPU Opcode coverage test", () => {
    test("Check all official 6502 opcodes are handled", () => {
      const implemented: number[] = [];
      const missing: number[] = [];

      for (const opcode of officialOpcodes) {
        const cpu = new CPU();
        cpu.memory[0xfffc] = 0x00;
        cpu.memory[0xfffd] = 0x80;
        cpu.reset();

        cpu.memory[0x8000] = opcode;

        try {
          cpu.step();
          implemented.push(opcode);
        } catch {
          missing.push(opcode);
        }
      }

      if (missing.length > 0) {
        throw new Error(
          `--------------------------------------------------------------\n` +
            `Total opcode implementations done:\t\t${implemented.length}` +
            `\nIncomplete opcodes:\t\t\t\t${missing.length}\n` +
            `Missing opcode implementations:\n` +
            `--------------------------------------------------------------\n` +
            missing.map((o) => `0x${o.toString(16).toUpperCase()}`).join(", ") +
            `\n\nImplemented opcodes:\n` +
            implemented
              .map((o) => `0x${o.toString(16).toUpperCase()}`)
              .join(", ")
        );
      }
    });
  });
  describe("ADC Tests", () => {
    test("ADC immediate adds value to A without carry", () => {
      cpu.A = 0x10;
      cpu.memory[0x8000] = 0x69; // ADC #$05
      cpu.memory[0x8001] = 0x05;
      cpu.SR &= ~0x01; // Clear carry

      cpu.step();

      expect(cpu.A).toBe(0x15);
      expect(cpu.SR & 0x01).toBe(0); // Carry = 0
      expect(cpu.SR & 0x02).toBe(0); // Zero = 0
      expect(cpu.SR & 0x80).toBe(0); // Negative = 0
      expect(cpu.SR & 0x40).toBe(0); // Overflow = 0
    });

    test("ADC immediate includes carry flag in addition", () => {
      cpu.A = 0x10;
      cpu.memory[0x8000] = 0x69;
      cpu.memory[0x8001] = 0x01;
      cpu.SR |= 0x01; // Set carry

      cpu.step();

      expect(cpu.A).toBe(0x12);
    });

    test("ADC sets carry flag when result > 0xFF", () => {
      cpu.A = 0xf0;
      cpu.memory[0x8000] = 0x69;
      cpu.memory[0x8001] = 0x20;
      cpu.SR &= ~0x01;

      cpu.step();

      expect(cpu.A).toBe(0x10); // 0xF0 + 0x20 = 0x110, so A = 0x10
      expect(cpu.SR & 0x01).toBe(0x01); // Carry = 1
    });

    test("ADC sets overflow when signed overflow occurs", () => {
      cpu.A = 0x50;
      cpu.memory[0x8000] = 0x69;
      cpu.memory[0x8001] = 0x50;
      cpu.SR &= ~0x01;

      cpu.step();

      expect(cpu.A).toBe(0xa0);
      expect(cpu.SR & 0x40).toBe(0x40); // Overflow = 1
      expect(cpu.SR & 0x80).toBe(0x80); // Negative = 1
    });

    test("ADC sets zero flag if result is zero", () => {
      cpu.A = 0x00;
      cpu.memory[0x8000] = 0x69;
      cpu.memory[0x8001] = 0x00;
      cpu.SR &= ~0x01;

      cpu.step();

      expect(cpu.A).toBe(0x00);
      expect(cpu.SR & 0x02).toBe(0x02); // Zero = 1
    });

    test("ADC clears overflow and carry when not triggered", () => {
      cpu.A = 0x01;
      cpu.memory[0x8000] = 0x69;
      cpu.memory[0x8001] = 0x01;
      cpu.SR |= 0x41; // Set overflow and carry before instruction

      cpu.step();

      expect(cpu.A).toBe(0x03);
      expect(cpu.SR & 0x01).toBe(0); // Carry cleared
      expect(cpu.SR & 0x40).toBe(0); // Overflow cleared
    });
    test("ADC zero page", () => {
      cpu.memory[0x0042] = 0x10;
      cpu.A = 0x20;
      cpu.memory[0x8000] = 0x65; // ADC $42
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0x30);
    });

    test("ADC zero page,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0x22;
      cpu.A = 0x10;
      cpu.memory[0x8000] = 0x75; // ADC $42,X
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0x32);
    });

    test("ADC absolute", () => {
      cpu.memory[0x1234] = 0x44;
      cpu.A = 0x01;
      cpu.memory[0x8000] = 0x6d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0x45);
    });

    test("ADC absolute,X", () => {
      cpu.X = 0x02;
      cpu.memory[0x1236] = 0x10;
      cpu.A = 0x01;
      cpu.memory[0x8000] = 0x7d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0x11);
    });

    test("ADC absolute,Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x1235] = 0x22;
      cpu.A = 0x10;
      cpu.memory[0x8000] = 0x79;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0x32);
    });

    test("ADC (indirect,X)", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0x00; // lo
      cpu.memory[0x0044] = 0x90; // hi → address = 0x9000
      cpu.memory[0x9000] = 0x55;
      cpu.A = 0x01;
      cpu.memory[0x8000] = 0x61;
      cpu.memory[0x8001] = 0x42; // $42 + X = $43
      cpu.step();
      expect(cpu.A).toBe(0x56);
    });

    test("ADC (indirect),Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x0042] = 0x00; // lo
      cpu.memory[0x0043] = 0x90; // hi → address = 0x9000 + Y = 0x9001
      cpu.memory[0x9001] = 0x66;
      cpu.A = 0x01;
      cpu.memory[0x8000] = 0x71;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0x67);
    });
  });
  describe("ASL Tests", () => {
    test("ASL accumulator", () => {
      cpu.A = 0b01010101;
      cpu.memory[0x8000] = 0x0a; // ASL A
      cpu.step();
      expect(cpu.A).toBe(0b10101010);
      expect(cpu.SR & 0x01).toBe(0); // Carry cleared
    });

    test("ASL accumulator sets carry when bit 7 is shifted out", () => {
      cpu.A = 0b10000000;
      cpu.memory[0x8000] = 0x0a;
      cpu.step();
      expect(cpu.A).toBe(0);
      expect(cpu.SR & 0x01).toBe(1); // Carry set
      expect(cpu.SR & 0x02).toBe(0x02); // Zero flag set (result is 0)
    });

    test("ASL zero page", () => {
      cpu.memory[0x0042] = 0b01010101;
      cpu.memory[0x8000] = 0x06; // ASL $42
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0042]).toBe(0b10101010);
    });

    test("ASL zero page,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0b01010101;
      cpu.memory[0x8000] = 0x16; // ASL $42,X
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0043]).toBe(0b10101010);
    });

    test("ASL absolute", () => {
      cpu.memory[0x1234] = 0b01010101;
      cpu.memory[0x8000] = 0x0e; // ASL $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1234]).toBe(0b10101010);
    });

    test("ASL absolute,X", () => {
      cpu.X = 0x02;
      cpu.memory[0x1236] = 0b01010101;
      cpu.memory[0x8000] = 0x1e; // ASL $1234,X
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1236]).toBe(0b10101010);
    });
  });
  describe("BCC Tests", () => {
    test("BCC branches when carry clear", () => {
      cpu.SR &= ~0x01; // Clear carry flag
      cpu.memory[0x8000] = 0x90; // BCC
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BCC does not branch when carry set", () => {
      cpu.SR |= 0x01; // Set carry flag
      cpu.memory[0x8000] = 0x90; // BCC
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002); // Just moves past BCC instruction
    });

    test("BCC branches backward with negative offset", () => {
      cpu.SR &= ~0x01; // Clear carry flag
      cpu.memory[0x8005] = 0x90; // BCC opcode at 0x8005
      cpu.memory[0x8006] = 0xfb; // offset -5 at 0x8006
      cpu.PC = 0x8005;
      cpu.step();
      expect(cpu.PC).toBe(0x8002); // 0x8007 - 5 = 0x8002
    });
  });
  describe("BIT Tests", () => {
    test("BIT zero page sets Z, V, N flags correctly", () => {
      cpu.A = 0b1100;
      cpu.memory[0x0042] = 0b01000001; // bit7=0, bit6=1, rest set
      cpu.memory[0x8000] = 0x24; // BIT $42
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02);
      expect(cpu.SR & 0x40).toBe(0x40);
      expect(cpu.SR & 0x80).toBe(0x00);
    });

    test("BIT zero page sets zero flag if no bits match", () => {
      cpu.A = 0b0011;
      cpu.memory[0x0042] = 0b01000000; // bit7=0, bit6=1, rest zero
      cpu.memory[0x8000] = 0x24; // BIT $42
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Z = 1 (no bit matches)
    });

    test("BIT absolute works the same", () => {
      cpu.A = 0b1010;
      cpu.memory[0x1234] = 0b11000000; // bit7=1, bit6=1
      cpu.memory[0x8000] = 0x2c; // BIT $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Z=0 (A & M != 0)
      expect(cpu.SR & 0x40).toBe(0x40); // V=1
      expect(cpu.SR & 0x80).toBe(0x80); // N=1
    });
  });

  describe("BMI Instruction", () => {
    test("BMI branches when negative flag set", () => {
      cpu.SR |= 0x80; // Set negative flag
      cpu.memory[0x8000] = 0x30; // BMI
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BMI does not branch when negative flag clear", () => {
      cpu.SR &= ~0x80; // Clear negative flag
      cpu.memory[0x8000] = 0x30; // BMI
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("BNE Instruction", () => {
    test("BNE branches when zero flag clear", () => {
      cpu.SR &= ~0x02; // Clear zero flag
      cpu.memory[0x8000] = 0xd0; // BNE
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BNE does not branch when zero flag set", () => {
      cpu.SR |= 0x02; // Set zero flag
      cpu.memory[0x8000] = 0xd0; // BNE
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("BPL Instruction", () => {
    test("BPL branches when negative flag clear", () => {
      cpu.SR &= ~0x80; // Clear negative flag
      cpu.memory[0x8000] = 0x10; // BPL
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BPL does not branch when negative flag set", () => {
      cpu.SR |= 0x80; // Set negative flag
      cpu.memory[0x8000] = 0x10; // BPL
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });
  describe("BRK Instruction", () => {
    test("BRK sets interrupt flag and jumps to IRQ vector", () => {
      cpu.memory[0xfffe] = 0x00;
      cpu.memory[0xffff] = 0x90;
      cpu.PC = 0x8000;
      cpu.memory[0x8000] = 0x00; // BRK
      cpu.step();
      expect(cpu.SR & 0x04).toBe(0x04); // Break flag set
      expect(cpu.PC).toBe(0x9000);
    });
  });

  describe("BVC Instruction", () => {
    test("BVC branches when overflow clear", () => {
      cpu.SR &= ~0x40; // Clear overflow flag
      cpu.memory[0x8000] = 0x50; // BVC
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BVC does not branch when overflow set", () => {
      cpu.SR |= 0x40; // Set overflow flag
      cpu.memory[0x8000] = 0x50; // BVC
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("BVS Instruction", () => {
    test("BVS branches when overflow set", () => {
      cpu.SR |= 0x40; // Set overflow flag
      cpu.memory[0x8000] = 0x70; // BVS
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BVS does not branch when overflow clear", () => {
      cpu.SR &= ~0x40; // Clear overflow flag
      cpu.memory[0x8000] = 0x70; // BVS
      cpu.memory[0x8001] = 0x05;
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("CLC Instruction", () => {
    test("CLC clears carry flag", () => {
      cpu.SR |= 0x01; // Set carry flag
      cpu.memory[0x8000] = 0x18; // CLC
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0);
    });
  });

  describe("CLD Instruction", () => {
    test("CLD clears decimal flag", () => {
      cpu.SR |= 0x08; // Set decimal flag
      cpu.memory[0x8000] = 0xd8; // CLD
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.SR & 0x08).toBe(0);
    });
  });

  describe("BCS Instruction", () => {
    test("BCS branches when carry set", () => {
      cpu.SR |= 0x01; // Carry flag set
      cpu.memory[0x8000] = 0xb0; // BCS
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BCS does not branch when carry clear", () => {
      cpu.SR &= ~0x01; // Carry flag clear
      cpu.memory[0x8000] = 0xb0; // BCS
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });
  describe("BEQ Instruction", () => {
    test("BEQ branches when zero set", () => {
      cpu.SR |= 0x02; // Zero flag set
      cpu.memory[0x8000] = 0xf0; // BEQ
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002 + 5);
    });

    test("BEQ does not branch when zero clear", () => {
      cpu.SR &= ~0x02; // Zero flag clear
      cpu.memory[0x8000] = 0xf0; // BEQ
      cpu.memory[0x8001] = 0x05; // branch +5
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("CLI Instruction", () => {
    test("CLI clears Interrupt Disable flag", () => {
      cpu.SR |= 0x04; // Set Interrupt Disable flag
      cpu.memory[0x8000] = 0x58; // CLI
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.SR & 0x04).toBe(0);
    });
  });

  describe("CLV Instruction", () => {
    test("CLV clears Overflow flag", () => {
      cpu.SR |= 0x40; // Set Overflow flag
      cpu.memory[0x8000] = 0xb8; // CLV
      cpu.PC = 0x8000;
      cpu.step();
      expect(cpu.SR & 0x40).toBe(0);
    });
  });

  describe("LDA Tests", () => {
    test("0xa9 - LDA immediate loads value into A and sets flags", () => {
      cpu.memory[0x8000] = 0xa9; // LDA #$42
      cpu.memory[0x8001] = 0x42;
      cpu.step();

      expect(cpu.A).toBe(0x42);
      expect(cpu.PC).toBe(0x8002);
      expect(cpu.SR & 0b10).toBe(0); // Z flag = 0
      expect(cpu.SR & 0b10000000).toBe(0); // N flag = 0
    });
    test("0xb5 - LDA Zero Page,X loads value from memory + X into A and sets flags", () => {
      cpu.X = 0x10; // Set X to 0x10
      cpu.memory[0x0052] = 0x77; // Memory at base + X = 0x42 + 0x10 = 0x52 contains 0x77
      cpu.memory[0x8000] = 0xb5; // Opcode for LDA Zero Page,X
      cpu.memory[0x8001] = 0x42; // Base zero page address is 0x42

      cpu.step();

      expect(cpu.A).toBe(0x77); // A should now hold the value at 0x52
      expect(cpu.PC).toBe(0x8002); // PC should advance by 2 bytes
      expect(cpu.SR & 0b10).toBe(0); // Zero flag should be clear (value != 0)
      expect(cpu.SR & 0b10000000).toBe(0); // Negative flag clear (0x77 < 0x80)
    });
    test("LDA immediate sets zero flag when value is 0", () => {
      cpu.memory[0x8000] = 0xa9;
      cpu.memory[0x8001] = 0x00;
      cpu.step();

      expect(cpu.A).toBe(0x00);
      expect(cpu.SR & 0b10).toBe(0b10); // Z flag = 1
    });

    test("LDA immediate sets negative flag when value is negative (0x80)", () => {
      cpu.memory[0x8000] = 0xa9;
      cpu.memory[0x8001] = 0x80;
      cpu.step();

      expect(cpu.A).toBe(0x80);
      expect(cpu.SR & 0b10000000).toBe(0b10000000); // N flag = 1
    });
    test("0xad - LDA absolute loads value from memory into A", () => {
      cpu.memory[0x1234] = 0x77;
      cpu.memory[0x8000] = 0xad; // LDA $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();

      expect(cpu.A).toBe(0x77);
      expect(cpu.PC).toBe(0x8003);
    });

    test("0xa5 - LDA zero page loads value from memory into A", () => {
      cpu.memory[0x0042] = 0x55;
      cpu.memory[0x8000] = 0xa5; // LDA $42
      cpu.memory[0x8001] = 0x42;
      cpu.step();

      expect(cpu.A).toBe(0x55);
      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("NOP Tests", () => {
    test("NOP does nothing but increment PC", () => {
      cpu.memory[0x8000] = 0xea;
      cpu.step();

      expect(cpu.A).toBe(0);
      expect(cpu.PC).toBe(0x8001);
    });
  });

  describe("STA Tests", () => {
    test("STA absolute stores accumulator into memory", () => {
      cpu.A = 0x99;
      cpu.memory[0x8000] = 0x8d; // STA $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();

      expect(cpu.memory[0x1234]).toBe(0x99);
      expect(cpu.PC).toBe(0x8003);
    });
  });

  describe("DEX Tests", () => {
    test("DEX decrements X and sets flags", () => {
      cpu.X = 0x10;
      cpu.memory[0x8000] = 0xca; // DEX
      cpu.step();

      expect(cpu.X).toBe(0x0f);
      expect(cpu.SR & 0b10).toBe(0); // Z = 0
    });

    test("DEX sets zero flag when X reaches 0", () => {
      cpu.X = 0x01;
      cpu.memory[0x8000] = 0xca;
      cpu.step();

      expect(cpu.X).toBe(0x00);
      expect(cpu.SR & 0b10).toBe(0b10); // Z = 1
    });

    test("DEX sets negative flag when result >= 0x80", () => {
      cpu.X = 0x80;
      cpu.memory[0x8000] = 0xca;
      cpu.step();

      expect(cpu.X).toBe(0x7f);
      expect(cpu.SR & 0b10000000).toBe(0); // N = 0
    });
  });
  describe("Branching Tests", () => {
    test("BEQ branches forward when zero flag is set", () => {
      cpu.SR |= 0x02; // Set Z flag
      cpu.memory[0x8000] = 0xf0; // BEQ +2
      cpu.memory[0x8001] = 0x02;
      cpu.step();

      expect(cpu.PC).toBe(0x8002 + 2); // +2 offset
    });

    test("BEQ does not branch when zero flag is clear", () => {
      cpu.SR &= ~0x02; // Clear Z flag
      cpu.memory[0x8000] = 0xf0;
      cpu.memory[0x8001] = 0x02;
      cpu.step();

      expect(cpu.PC).toBe(0x8002); // No jump
    });

    test("BNE branches backward when zero flag is clear", () => {
      cpu.SR &= ~0x02;
      cpu.memory[0x8000] = 0xd0; // BNE -2
      cpu.memory[0x8001] = 0xfe; // -2 as unsigned (0xFE = -2)
      cpu.step();

      expect(cpu.PC).toBe(0x8002 - 2);
    });

    test("BNE does not branch when zero flag is set", () => {
      cpu.SR |= 0x02;
      cpu.memory[0x8000] = 0xd0;
      cpu.memory[0x8001] = 0x05;
      cpu.step();

      expect(cpu.PC).toBe(0x8002);
    });
  });

  describe("STX Tests", () => {
    test("STX absolute stores X into memory", () => {
      cpu.X = 0xcc;
      cpu.memory[0x8000] = 0x8e; // STX $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();

      expect(cpu.memory[0x1234]).toBe(0xcc);
      expect(cpu.PC).toBe(0x8003);
    });
  });

  describe("JMP Tests", () => {
    test("JMP absolute sets PC to target address", () => {
      cpu.memory[0x8000] = 0x4c; // JMP $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();

      expect(cpu.PC).toBe(0x1234);
    });
  });

  describe("INX Tests", () => {
    test("INX increments X and sets flags", () => {
      cpu.X = 0x00;
      cpu.memory[0x8000] = 0xe8; // INX
      cpu.step();

      expect(cpu.X).toBe(0x01);
      expect(cpu.SR & 0b10).toBe(0); // Z = 0
      expect(cpu.SR & 0b10000000).toBe(0); // N = 0
    });

    test("INX sets zero flag when result is 0", () => {
      cpu.X = 0xff;
      cpu.memory[0x8000] = 0xe8;
      cpu.step();

      expect(cpu.X).toBe(0x00);
      expect(cpu.SR & 0b10).toBe(0b10); // Z = 1
    });

    test("INX sets negative flag when result is >= 0x80", () => {
      cpu.X = 0x7f;
      cpu.memory[0x8000] = 0xe8;
      cpu.step();

      expect(cpu.X).toBe(0x80);
      expect(cpu.SR & 0b10000000).toBe(0b10000000); // N = 1
    });
  });

  describe("LDX Tests", () => {
    test("LDX immediate loads value into X and sets flags", () => {
      cpu.memory[0x8000] = 0xa2; // LDX #$10
      cpu.memory[0x8001] = 0x10;
      cpu.step();

      expect(cpu.X).toBe(0x10);
      expect(cpu.PC).toBe(0x8002);
    });

    test("LDX absolute loads value from memory into X", () => {
      cpu.memory[0x1234] = 0xaa;
      cpu.memory[0x8000] = 0xae; // LDX $1234
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();

      expect(cpu.X).toBe(0xaa);
      expect(cpu.PC).toBe(0x8003);
    });
  });
});
