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
  });

  describe("BNE Tests", () => {
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

  describe("CMP Instructions", () => {
    beforeEach(() => {
      cpu.A = 0x50;
    });

    test("CMP immediate", () => {
      cpu.memory[0x8000] = 0xc9; // CMP #$40
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01); // Carry set
      expect(cpu.SR & 0x02).toBe(0); // Zero clear
      expect(cpu.SR & 0x80).toBe(0); // Negative clear
    });

    test("CMP zero page", () => {
      cpu.memory[0x0042] = 0x30;
      cpu.memory[0x8000] = 0xc5;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01); // Carry set
    });

    test("CMP zero page,X", () => {
      cpu.X = 0x02;
      cpu.memory[0x0044] = 0x20;
      cpu.memory[0x8000] = 0xd5;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01);
    });

    test("CMP absolute", () => {
      cpu.memory[0x1234] = 0x10;
      cpu.memory[0x8000] = 0xcd;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01);
    });

    test("CMP absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x50;
      cpu.memory[0x8000] = 0xdd;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Zero set
    });

    test("CMP absolute,Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x1235] = 0x40;
      cpu.memory[0x8000] = 0xd9;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01);
    });

    test("CMP (indirect,X)", () => {
      cpu.X = 0x04;
      cpu.memory[0x0044] = 0x78;
      cpu.memory[0x0045] = 0x56;
      cpu.memory[0x5678] = 0x50;
      cpu.memory[0x8000] = 0xc1;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Zero set
    });

    test("CMP (indirect),Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x0040] = 0x00;
      cpu.memory[0x0041] = 0x20;
      cpu.memory[0x2001] = 0x10;
      cpu.memory[0x8000] = 0xd1;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01);
    });
  });

  describe("CPX Instructions", () => {
    beforeEach(() => {
      cpu.X = 0x30;
    });

    test("CPX immediate sets flags", () => {
      cpu.memory[0x8000] = 0xe0;
      cpu.memory[0x8001] = 0x30;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Zero
      expect(cpu.SR & 0x01).toBe(0x01); // Carry
    });

    test("CPX zero page", () => {
      cpu.memory[0x0042] = 0x20;
      cpu.memory[0x8000] = 0xe4;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01); // Carry
    });

    test("CPX absolute", () => {
      cpu.memory[0x1234] = 0x40;
      cpu.memory[0x8000] = 0xec;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x80).toBe(0x80); // Negative
    });
  });

  describe("CPY Instructions", () => {
    beforeEach(() => {
      cpu.Y = 0x50;
    });

    test("CPY immediate sets flags", () => {
      cpu.memory[0x8000] = 0xc0;
      cpu.memory[0x8001] = 0x50;
      cpu.step();
      expect(cpu.SR & 0x02).toBe(0x02); // Zero
      expect(cpu.SR & 0x01).toBe(0x01); // Carry
    });

    test("CPY zero page", () => {
      cpu.memory[0x0042] = 0x10;
      cpu.memory[0x8000] = 0xc4;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01); // Carry
    });

    test("CPY absolute", () => {
      cpu.memory[0x1234] = 0x60;
      cpu.memory[0x8000] = 0xcc;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.SR & 0x80).toBe(0x80); // Negative
    });
  });

  describe("DEC/DEX/DEY Instructions", () => {
    test("DEC Zero Page", () => {
      cpu.memory[0x0042] = 0x05;
      cpu.memory[0x8000] = 0xc6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0042]).toBe(0x04);
      expect(cpu.SR & 0x02).toBe(0); // Zero clear
    });

    test("DEC Zero Page,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0x01;
      cpu.memory[0x8000] = 0xd6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0043]).toBe(0x00);
      expect(cpu.SR & 0x02).toBe(0x02); // Zero set
    });

    test("DEC Absolute", () => {
      cpu.memory[0x1234] = 0x00;
      cpu.memory[0x8000] = 0xce;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1234]).toBe(0xff);
      expect(cpu.SR & 0x80).toBe(0x80); // Negative set
    });

    test("DEC Absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x03;
      cpu.memory[0x8000] = 0xde;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1235]).toBe(0x02);
    });

    test("DEX decrements X and sets flags", () => {
      cpu.X = 0x01;
      cpu.memory[0x8000] = 0xca;
      cpu.step();
      expect(cpu.X).toBe(0x00);
      expect(cpu.SR & 0x02).toBe(0x02); // Zero set
    });

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

    test("DEY decrements Y and sets flags", () => {
      cpu.Y = 0x00;
      cpu.memory[0x8000] = 0x88;
      cpu.step();
      expect(cpu.Y).toBe(0xff);
      expect(cpu.SR & 0x80).toBe(0x80); // Negative set
    });
  });

  describe("EOR Instructions", () => {
    beforeEach(() => {
      cpu.A = 0b11001100;
    });

    test("EOR immediate", () => {
      cpu.memory[0x8000] = 0x49; // EOR #$AA
      cpu.memory[0x8001] = 0b10101010;
      cpu.step();
      expect(cpu.A).toBe(0b01100110);
    });

    test("EOR zero page", () => {
      cpu.memory[0x0042] = 0b11110000;
      cpu.memory[0x8000] = 0x45;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0b00111100);
    });

    test("EOR zero page,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0b11111111;
      cpu.memory[0x8000] = 0x55;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0b00110011);
    });

    test("EOR absolute", () => {
      cpu.memory[0x1234] = 0b00001111;
      cpu.memory[0x8000] = 0x4d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0b11000011);
    });

    test("EOR absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x00;
      cpu.memory[0x8000] = 0x5d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0b11001100); // XOR with 0
    });

    test("EOR absolute,Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x1235] = 0xff;
      cpu.memory[0x8000] = 0x59;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0b00110011); // XOR with 0xFF
    });

    test("EOR (indirect,X)", () => {
      cpu.X = 0x04;
      cpu.memory[0x0044] = 0x78;
      cpu.memory[0x0045] = 0x56;
      cpu.memory[0x5678] = 0b00000001;
      cpu.memory[0x8000] = 0x41;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.A).toBe(0b11001101);
    });

    test("EOR (indirect),Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x0040] = 0x00;
      cpu.memory[0x0041] = 0x20;
      cpu.memory[0x2001] = 0b00000010;
      cpu.memory[0x8000] = 0x51;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.A).toBe(0b11001110);
    });
  });

  describe("INC / INX / INY Instructions", () => {
    test("INC Zero Page", () => {
      cpu.memory[0x0042] = 0x00;
      cpu.memory[0x8000] = 0xe6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0042]).toBe(0x01);
    });

    test("INC Zero Page,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0xff;
      cpu.memory[0x8000] = 0xf6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0043]).toBe(0x00);
      expect(cpu.SR & 0x02).toBe(0x02); // Zero flag
    });

    test("INC Absolute", () => {
      cpu.memory[0x1234] = 0x7f;
      cpu.memory[0x8000] = 0xee;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1234]).toBe(0x80);
      expect(cpu.SR & 0x80).toBe(0x80); // Negative flag
    });

    test("INC Absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x03;
      cpu.memory[0x8000] = 0xfe;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1235]).toBe(0x04);
    });

    test("INX increments X and sets flags", () => {
      cpu.X = 0xff;
      cpu.memory[0x8000] = 0xe8;
      cpu.step();
      expect(cpu.X).toBe(0x00);
      expect(cpu.SR & 0x02).toBe(0x02); // Zero
    });

    test("INY increments Y and sets flags", () => {
      cpu.Y = 0x7f;
      cpu.memory[0x8000] = 0xc8;
      cpu.step();
      expect(cpu.Y).toBe(0x80);
      expect(cpu.SR & 0x80).toBe(0x80); // Negative
    });
  });

  describe("JMP, JSR, RTS Instructions", () => {
    test("JMP absolute sets PC", () => {
      cpu.memory[0x8000] = 0x4c;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.PC).toBe(0x1234);
    });

    test("JMP indirect sets PC (with 6502 bug)", () => {
      cpu.memory[0x8000] = 0x6c;
      cpu.memory[0x8001] = 0xff;
      cpu.memory[0x8002] = 0x10;
      cpu.memory[0x10ff] = 0x78;
      cpu.memory[0x1000] = 0x56; // Bug: high byte from 0x1000 not 0x1100
      cpu.step();
      expect(cpu.PC).toBe(0x5678);
    });

    test("JSR pushes return address and sets PC", () => {
      cpu.memory[0x8000] = 0x20;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x90;
      const originalSP = cpu.SP; // 0xFD by default
      cpu.step();

      expect(cpu.PC).toBe(0x9000);
      expect(cpu.SP).toBe((originalSP - 2) & 0xff); // = 0xFB

      const hi = cpu.read(0x01fd); // high byte pushed first
      const lo = cpu.read(0x01fc); // low byte pushed second
      expect((hi << 8) | lo).toBe(0x8002);
    });

    test("RTS pulls return address and jumps", () => {
      cpu.SP = 0xfb;
      cpu.write(0x01fc, 0x02); // low byte
      cpu.write(0x01fd, 0x80); // high byte
      cpu.memory[0x8000] = 0x60; // RTS
      cpu.step();
      expect(cpu.PC).toBe(0x8003); // pulled 0x8002 → add 1 = 0x8003
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

    test("LDA Zero Page,X loads A", () => {
      cpu.X = 0x04;
      cpu.memory[0x0046] = 0x77;
      cpu.memory[0x8000] = 0xb5; // LDA $42,X
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0x77);
    });

    test("LDA Absolute,X loads A", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x33;
      cpu.memory[0x8000] = 0xbd; // LDA $1234,X
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0x33);
    });

    test("LDA Absolute,Y loads A", () => {
      cpu.Y = 0x02;
      cpu.memory[0x5678] = 0x22;
      cpu.memory[0x8000] = 0xb9; // LDA $5676,Y
      cpu.memory[0x8001] = 0x76;
      cpu.memory[0x8002] = 0x56;
      cpu.step();
      expect(cpu.A).toBe(0x22);
    });

    test("LDA (Indirect,X) loads A", () => {
      cpu.X = 0x04;
      cpu.memory[0x0024] = 0x00;
      cpu.memory[0x0025] = 0x90;
      cpu.memory[0x9000] = 0xab;
      cpu.memory[0x8000] = 0xa1; // LDA ($20,X)
      cpu.memory[0x8001] = 0x20;
      cpu.step();
      expect(cpu.A).toBe(0xab);
    });

    test("LDA (Indirect),Y loads A", () => {
      cpu.Y = 0x01;
      cpu.memory[0x0030] = 0x00;
      cpu.memory[0x0031] = 0x90;
      cpu.memory[0x9001] = 0xcd;
      cpu.memory[0x8000] = 0xb1; // LDA ($30),Y
      cpu.memory[0x8001] = 0x30;
      cpu.step();
      expect(cpu.A).toBe(0xcd);
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
    test("LDX immediate", () => {
      cpu.memory[0x8000] = 0xa2;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.X).toBe(0x42);
    });

    test("LDX zero page", () => {
      cpu.memory[0x0042] = 0x99;
      cpu.memory[0x8000] = 0xa6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.X).toBe(0x99);
    });

    test("LDX zero page,Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x0043] = 0x55;
      cpu.memory[0x8000] = 0xb6;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.X).toBe(0x55);
    });

    test("LDX absolute", () => {
      cpu.memory[0x1234] = 0x10;
      cpu.memory[0x8000] = 0xae;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.X).toBe(0x10);
    });

    test("LDX absolute,Y", () => {
      cpu.Y = 0x01;
      cpu.memory[0x1235] = 0x20;
      cpu.memory[0x8000] = 0xbe;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.X).toBe(0x20);
    });
  });

  describe("LDY Instructions", () => {
    test("LDY immediate", () => {
      cpu.memory[0x8000] = 0xa0;
      cpu.memory[0x8001] = 0x55;
      cpu.step();
      expect(cpu.Y).toBe(0x55);
    });

    test("LDY zero page", () => {
      cpu.memory[0x0042] = 0x66;
      cpu.memory[0x8000] = 0xa4;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.Y).toBe(0x66);
    });

    test("LDY zero page,X", () => {
      cpu.X = 0x03;
      cpu.memory[0x0045] = 0x99;
      cpu.memory[0x8000] = 0xb4;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.Y).toBe(0x99);
    });

    test("LDY absolute", () => {
      cpu.memory[0x2000] = 0x33;
      cpu.memory[0x8000] = 0xac;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x20;
      cpu.step();
      expect(cpu.Y).toBe(0x33);
    });

    test("LDY absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x2001] = 0x77;
      cpu.memory[0x8000] = 0xbc;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x20;
      cpu.step();
      expect(cpu.Y).toBe(0x77);
    });
  });

  describe("LSR Instructions", () => {
    test("LSR Accumulator", () => {
      cpu.A = 0b00000011;
      cpu.memory[0x8000] = 0x4a;
      cpu.step();
      expect(cpu.A).toBe(0b00000001);
      expect(cpu.SR & 0x01).toBe(1); // Carry was set
    });

    test("LSR Zero Page", () => {
      cpu.memory[0x0042] = 0b00000010;
      cpu.memory[0x8000] = 0x46;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0042]).toBe(0b00000001);
      expect(cpu.SR & 0x01).toBe(0); // No carry
    });

    test("LSR Zero Page,X", () => {
      cpu.X = 1;
      cpu.memory[0x0043] = 0b00000001;
      cpu.memory[0x8000] = 0x56;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.memory[0x0043]).toBe(0b00000000);
      expect(cpu.SR & 0x01).toBe(1); // Carry
      expect(cpu.SR & 0x02).toBe(0x02); // Zero flag
    });

    test("LSR Absolute", () => {
      cpu.memory[0x1234] = 0b11111110;
      cpu.memory[0x8000] = 0x4e;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.memory[0x1234]).toBe(0b01111111);
      expect(cpu.SR & 0x01).toBe(0); // No carry
    });

    test("LSR Absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x2001] = 0b00000001;
      cpu.memory[0x8000] = 0x5e;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x20;
      cpu.step();
      expect(cpu.memory[0x2001]).toBe(0x00);
      expect(cpu.SR & 0x01).toBe(1); // Carry
      expect(cpu.SR & 0x02).toBe(0x02); // Zero
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

  describe("ORA Instruction", () => {
    test("ORA immediate sets A and flags", () => {
      cpu.A = 0b00001100;
      cpu.memory[0x8000] = 0x09;
      cpu.memory[0x8001] = 0b00110000;
      cpu.step();
      expect(cpu.A).toBe(0b00111100);
      expect(cpu.SR & 0x02).toBe(0); // Z = 0
      expect(cpu.SR & 0x80).toBe(0); // N = 0
    });

    test("ORA zero page", () => {
      cpu.A = 0b00001000;
      cpu.memory[0x0042] = 0b11110000;
      cpu.memory[0x8000] = 0x05;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0b11111000);
    });

    test("ORA zero page,X", () => {
      cpu.A = 0b00000001;
      cpu.X = 0x01;
      cpu.memory[0x0043] = 0b00000010;
      cpu.memory[0x8000] = 0x15;
      cpu.memory[0x8001] = 0x42;
      cpu.step();
      expect(cpu.A).toBe(0b00000011);
    });

    test("ORA absolute", () => {
      cpu.A = 0b00000001;
      cpu.memory[0x1234] = 0b00000010;
      cpu.memory[0x8000] = 0x0d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0b00000011);
    });

    test("ORA absolute,X", () => {
      cpu.A = 0b00000010;
      cpu.X = 1;
      cpu.memory[0x1235] = 0b00000001;
      cpu.memory[0x8000] = 0x1d;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.A).toBe(0b00000011);
    });

    test("ORA (Indirect,X)", () => {
      cpu.A = 0b00001000;
      cpu.X = 4;
      cpu.memory[0x0004 + 0x10] = 0x00;
      cpu.memory[0x0005 + 0x10] = 0x90;
      cpu.memory[0x9000] = 0b00000111;
      cpu.memory[0x8000] = 0x01;
      cpu.memory[0x8001] = 0x10;
      cpu.step();
      expect(cpu.A).toBe(0b00001111);
    });

    test("ORA (Indirect),Y", () => {
      cpu.A = 0b11110000;
      cpu.Y = 1;
      cpu.memory[0x0010] = 0x00;
      cpu.memory[0x0011] = 0x90;
      cpu.memory[0x9001] = 0b00001111;
      cpu.memory[0x8000] = 0x11;
      cpu.memory[0x8001] = 0x10;
      cpu.step();
      expect(cpu.A).toBe(0b11111111);
    });
  });

  describe("PHP/PLA/PHA Stack Instructions", () => {
    test("PHA pushes A to stack", () => {
      cpu.A = 0x42;
      const spBefore = cpu.SP;
      cpu.memory[0x8000] = 0x48; // PHA
      cpu.step();

      expect(cpu.read(0x0100 + spBefore)).toBe(0x42);
      expect(cpu.SP).toBe((spBefore - 1) & 0xff);
    });

    test("PHP pushes status register to stack", () => {
      cpu.SR = 0b11001100;
      const spBefore = cpu.SP;
      cpu.memory[0x8000] = 0x08; // PHP
      cpu.step();

      expect(cpu.read(0x0100 + spBefore)).toBe(0b11001100 | 0x30); // bits 4 and 5 always set
      expect(cpu.SP).toBe((spBefore - 1) & 0xff);
    });

    test("PLA pulls from stack into A", () => {
      cpu.push(0x99);
      cpu.memory[0x8000] = 0x68; // PLA
      cpu.step();

      expect(cpu.A).toBe(0x99);
      expect(cpu.SR & 0x02).toBe(0); // Z = 0
      expect(cpu.SR & 0x80).toBe(0x80); // N = 1
    });

    test("PLP pulls from stack into status register", () => {
      cpu.push(0b01000101); // Value with B = 0, bit 5 = 1
      cpu.memory[0x8000] = 0x28; // PLP
      cpu.step();

      // Expect SR to be 0x65 = 0b01100101 (bit 5 set, bit 4 unchanged or forced off)
      expect(cpu.SR).toBe((0b01000101 & 0xef) | 0x20);
    });
  });

  describe("ROL/ROR Instructions", () => {
    test("ROL Accumulator", () => {
      cpu.A = 0b01010101;
      cpu.SR |= 0x01; // Carry = 1
      cpu.memory[0x8000] = 0x2a; // ROL A
      cpu.step();
      expect(cpu.A).toBe(0b10101011);
      expect(cpu.SR & 0x01).toBe(0); // Old bit 7 = 0
    });

    test("ROR Accumulator", () => {
      cpu.A = 0b10101010;
      cpu.SR &= ~0x01; // Carry = 0
      cpu.memory[0x8000] = 0x6a; // ROR A
      cpu.step();
      expect(cpu.A).toBe(0b01010101);
      expect(cpu.SR & 0x01).toBe(0); // Old bit 0 = 0
    });

    test("ROL Zero Page", () => {
      cpu.memory[0x0040] = 0x80;
      cpu.SR |= 0x01; // Carry = 1
      cpu.memory[0x8000] = 0x26;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.read(0x0040)).toBe(0x01);
      expect(cpu.SR & 0x01).toBe(0x01); // Bit 7 was 1 → Carry = 1
    });

    test("ROR Zero Page,X", () => {
      cpu.X = 1;
      cpu.memory[0x0041] = 0x01;
      cpu.SR |= 0x01; // Carry = 1
      cpu.memory[0x8000] = 0x76;
      cpu.memory[0x8001] = 0x40;
      cpu.step();
      expect(cpu.read(0x0041)).toBe(0x80);
      expect(cpu.SR & 0x01).toBe(0x01); // Old bit 0 was 1 → Carry = 1
    });

    test("ROL Absolute", () => {
      cpu.memory[0x1234] = 0xff;
      cpu.SR &= ~0x01; // Clear Carry
      cpu.memory[0x8000] = 0x2e;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.read(0x1234)).toBe(0xfe);
      expect(cpu.SR & 0x01).toBe(0x01);
    });

    test("ROR Absolute,X", () => {
      cpu.X = 0x01;
      cpu.memory[0x1235] = 0x02;
      cpu.SR &= ~0x01;
      cpu.memory[0x8000] = 0x7e;
      cpu.memory[0x8001] = 0x34;
      cpu.memory[0x8002] = 0x12;
      cpu.step();
      expect(cpu.read(0x1235)).toBe(0x01);
      expect(cpu.SR & 0x01).toBe(0x00);
    });
  });
  describe("SBC, SEC, SED, SEI Instructions", () => {
    beforeEach(() => {
      cpu.reset();
    });

    test("SEC sets carry flag", () => {
      cpu.SR &= ~0x01; // Clear carry
      cpu.memory[0x8000] = 0x38; // SEC
      cpu.step();
      expect(cpu.SR & 0x01).toBe(0x01);
    });

    test("SED sets decimal flag", () => {
      cpu.SR &= ~0x08; // Clear decimal
      cpu.memory[0x8000] = 0xf8; // SED
      cpu.step();
      expect(cpu.SR & 0x08).toBe(0x08);
    });

    test("SEI sets interrupt disable flag", () => {
      cpu.SR &= ~0x04; // Clear interrupt disable
      cpu.memory[0x8000] = 0x78; // SEI
      cpu.step();
      expect(cpu.SR & 0x04).toBe(0x04);
    });

    test("SBC immediate subtracts correctly and updates flags", () => {
      cpu.A = 0x50;
      cpu.SR |= 0x01; // Carry set
      cpu.memory[0x8000] = 0xe9; // SBC immediate
      cpu.memory[0x8001] = 0x10; // value 0x10
      cpu.step();
      expect(cpu.A).toBe(0x40); // 0x50 - 0x10 = 0x40
      expect(cpu.SR & 0x01).toBe(0x01); // Carry set (no borrow)
      expect(cpu.SR & 0x02).toBe(0); // Zero clear
      expect(cpu.SR & 0x80).toBe(0); // Negative clear
    });

    test("SBC immediate causes borrow and clears carry", () => {
      cpu.A = 0x10;
      cpu.SR |= 0x01; // Carry set
      cpu.memory[0x8000] = 0xe9; // SBC immediate
      cpu.memory[0x8001] = 0x20; // value 0x20
      cpu.step();
      expect(cpu.A).toBe(0xf0); // 0x10 - 0x20 = -0x10 (0xF0 2's complement)
      expect(cpu.SR & 0x01).toBe(0); // Carry clear (borrow)
      expect(cpu.SR & 0x80).toBe(0x80); // Negative set
    });
  });

  describe("STA Instructions", () => {
    test("STA Zero Page", () => {
      cpu.A = 0x42;
      cpu.memory[0x8000] = 0x85;
      cpu.memory[0x8001] = 0x10;
      cpu.step();
      expect(cpu.memory[0x0010]).toBe(0x42);
    });

    test("STA Zero Page,X", () => {
      cpu.A = 0x42;
      cpu.X = 0x01;
      cpu.memory[0x8000] = 0x95;
      cpu.memory[0x8001] = 0x10;
      cpu.step();
      expect(cpu.memory[0x0011]).toBe(0x42);
    });

    test("STA Absolute", () => {
      cpu.A = 0x42;
      cpu.memory[0x8000] = 0x8d;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x90;
      cpu.step();
      expect(cpu.memory[0x9000]).toBe(0x42);
    });

    test("STA Absolute,X", () => {
      cpu.A = 0x42;
      cpu.X = 0x10;
      cpu.memory[0x8000] = 0x9d;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x90;
      cpu.step();
      expect(cpu.memory[0x9010]).toBe(0x42);
    });

    test("STA Absolute,Y", () => {
      cpu.A = 0x42;
      cpu.Y = 0x10;
      cpu.memory[0x8000] = 0x99;
      cpu.memory[0x8001] = 0x00;
      cpu.memory[0x8002] = 0x90;
      cpu.step();
      expect(cpu.memory[0x9010]).toBe(0x42);
    });

    test("STA (Indirect,X)", () => {
      cpu.A = 0x42;
      cpu.X = 0x04;
      cpu.memory[0x8000] = 0x81;
      cpu.memory[0x8001] = 0x10;
      cpu.memory[0x0014] = 0x00;
      cpu.memory[0x0015] = 0x90;
      cpu.step();
      expect(cpu.memory[0x9000]).toBe(0x42);
    });

    test("STA (Indirect),Y", () => {
      cpu.A = 0x42;
      cpu.Y = 0x04;
      cpu.memory[0x8000] = 0x91;
      cpu.memory[0x8001] = 0x10;
      cpu.memory[0x0010] = 0x00;
      cpu.memory[0x0011] = 0x90;
      cpu.step();
      expect(cpu.memory[0x9004]).toBe(0x42);
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
});
