export class CPU {
  // Registers
  A = 0x00; // Accumulator (holds results of math or values from memory)
  X = 0x00; // X index register (used in some addressing modes)
  Y = 0x00; // Y index register (same as X)
  SP = 0xfd; // Stack pointer (used for subroutines and pushing/popping values)
  PC = 0x0000; // Program counter (where we are in memory)

  // Status Register (NV-BDIZC)
  // N: Negative, V: Overflow, -: unused, B: Break, D: Decimal, I: IRQ disable, Z: Zero, C: Carry
  SR = 0x24;

  // Memory (64KB RAM)
  memory = new Uint8Array(0x10000); // 64KB of RAM

  adc(value: number) {
    const carry = this.SR & 0x01;
    const sum = this.A + value + carry;
    const result = sum & 0xff;

    // Carry flag (bit 0)
    if (sum > 0xff) {
      this.SR |= 0x01;
    } else {
      this.SR &= ~0x01;
    }

    // Overflow flag (bit 6)
    if ((this.A ^ result) & 0x80 && !((this.A ^ value) & 0x80)) {
      this.SR |= 0x40;
    } else {
      this.SR &= ~0x40;
    }

    this.A = result;

    this.setZeroAndNegativeFlags(this.A);
  }

  private and(value: number) {
    this.A = this.A & value;
    this.setZeroAndNegativeFlags(this.A);
  }

  private asl(value: number) {
    const carry = value & 0x80 ? 1 : 0; // bit 7 into carry
    const result = (value << 1) & 0xff; // shift left, keep 8 bits

    // Update carry flag (bit 0)
    if (carry) {
      this.SR |= 0x01;
    } else {
      this.SR &= ~0x01;
    }

    this.setZeroAndNegativeFlags(result);
    return result;
  }
  private cmp(value: number) {
    const result = (this.A - value) & 0xff;

    // Set or clear Carry flag (bit 0)
    if (this.A >= value) this.SR |= 0x01;
    else this.SR &= ~0x01;

    // Set or clear Zero flag (bit 1)
    if (result === 0) this.SR |= 0x02;
    else this.SR &= ~0x02;

    // Set or clear Negative flag (bit 7)
    if (result & 0x80) this.SR |= 0x80;
    else this.SR &= ~0x80;
  }

  reset() {
    this.A = 0;
    this.X = 0;
    this.Y = 0;
    this.SP = 0xfd;
    this.SR = 0x24; // Carry Flag
    this.PC = this.readWord(0xfffc); // Reset vector
  }

  read(addr: number) {
    return this.memory[addr];
  }

  write(addr: number, value: number) {
    this.memory[addr] = value;
  }

  readWord(addr: number) {
    const lo = this.read(addr);
    const hi = this.read(addr + 1);
    return (hi << 8) | lo;
  }

  setZeroAndNegativeFlags(value: number) {
    if (value === 0) this.SR |= 0x02;
    else this.SR &= ~0x02;

    if (value & 0x80) this.SR |= 0x80;
    else this.SR &= ~0x80;
  }

  step() {
    const opcode = this.read(this.PC++);
    switch (opcode) {
      case 0xea: // NOP
        break;
      /**
       *            ADC - Add Memory to Accumulator with Carry
       */

      // Immediate
      case 0x69: {
        const M = this.read(this.PC++);
        this.adc(M);
        break;
      }

      // Zero Page       - ADC $nn
      case 0x65: {
        const addr = this.read(this.PC++);
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // Zero Page,X     - ADC $nn,X
      case 0x75: {
        const base = this.read(this.PC++);
        const addr = (base + this.X) & 0xff; // wrap in zero page
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // Absolute        - ADC $nnnn
      case 0x6d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // Absolute,X      - ADC $nnnn,X
      case 0x7d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // Absolute,Y      - ADC $nnnn,Y
      case 0x79: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // (Indirect,X)    - ADC ($nn,X)
      case 0x61: {
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = (hi << 8) | lo;
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      // (Indirect),Y    - ADC ($nn),Y
      case 0x71: {
        const zpAddr = this.read(this.PC++);
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = ((hi << 8) | lo) + this.Y;
        const M = this.read(addr);
        this.adc(M);
        break;
      }

      /**
       *  AND - AND Memory with Accumulator
       */
      // Immediate
      case 0x29: {
        const M = this.read(this.PC++);
        this.and(M);
        break;
      }

      // Zero Page
      case 0x25: {
        const addr = this.read(this.PC++);
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // Zero Page,X
      case 0x35: {
        const base = this.read(this.PC++);
        const addr = (base + this.X) & 0xff;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // Absolute
      case 0x2d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // Absolute,X
      case 0x3d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // Absolute,Y
      case 0x39: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // (Indirect,X)
      case 0x21: {
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = (hi << 8) | lo;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      // (Indirect),Y
      case 0x31: {
        const zpAddr = this.read(this.PC++);
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = ((hi << 8) | lo) + this.Y;
        const M = this.read(addr);
        this.and(M);
        break;
      }

      /**
       *    ASL
       */
      // ASL accumulator
      case 0x0a: {
        this.A = this.asl(this.A);
        break;
      }

      // zero page
      case 0x06: {
        const addr = this.read(this.PC++);
        const val = this.read(addr);
        const result = this.asl(val);
        this.write(addr, result);
        break;
      }

      // zero page,X
      case 0x16: {
        const base = this.read(this.PC++);
        const addr = (base + this.X) & 0xff;
        const val = this.read(addr);
        const result = this.asl(val);
        this.write(addr, result);
        break;
      }

      // absolute
      case 0x0e: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const val = this.read(addr);
        const result = this.asl(val);
        this.write(addr, result);
        break;
      }

      // absolute,X
      case 0x1e: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const val = this.read(addr);
        const result = this.asl(val);
        this.write(addr, result);
        break;
      }
      /**
       *    BCC - Branch on Carry Clear
       */
      case 0x90: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x01) === 0) {
          // Carry flag clear
          // Offset is signed 8-bit
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff; // Wrap 16-bit
        }
        break;
      }
      /**
       *    BCS - Branch on Carry Set
       */
      case 0xb0: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x01) !== 0) {
          // Carry flag set
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BEQ - Branch on Result Zero
       */
      case 0xf0: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x02) !== 0) {
          // Zero flag set
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BIT - Test Bits in Memory with Accumulator
       */
      case 0x24: {
        // BIT Zero Page
        const addr = this.read(this.PC++);
        const value = this.read(addr);
        const result = this.A & value;
        console.log("Before:", this.SR.toString(2));
        this.SR =
          (this.SR & ~(0x02 | 0x40 | 0x80)) |
          (result === 0 ? 0x02 : 0) |
          (value & 0x40) |
          (value & 0x80);
        console.log("After:", this.SR.toString(2));
        break;
      }

      case 0x2c: {
        // BIT Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const value = this.read(addr);
        const result = this.A & value;
        this.SR =
          (this.SR & ~(0x02 | 0x40 | 0x80)) |
          (result === 0 ? 0x02 : 0) |
          (value & 0x40) |
          (value & 0x80);
        break;
      }
      /**
       *    BMI - Branch on Result Minus
       */
      case 0x30: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x80) !== 0) {
          // Negative flag set
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BNE - Branch on Result not Zero
       */
      case 0xd0: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x02) === 0) {
          // Zero flag clear
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BPL - Branch on Result Plus
       */
      case 0x10: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x80) === 0) {
          // Negative flag clear
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BRK - Force Break
       */
      case 0x00: {
        // BRK
        this.SR |= 0x10; // Set Break flag (bit 4)
        this.SR |= 0x04; // Set Interrupt Disable flag (bit 2)
        this.PC = this.readWord(0xfffe); // Jump to IRQ vector
        break;
      }
      /**
       *    BVC - Branch on Overflow Clear
       */
      case 0x50: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x40) === 0) {
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BVS - Branch if Overflow Set
       */
      case 0x70: {
        const offset = this.read(this.PC++);
        if ((this.SR & 0x40) !== 0) {
          // Overflow flag set
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    CLC - Clear Carry Flag
       */
      case 0x18: {
        this.SR &= ~0x01;
        this.PC++;
        break;
      }
      /**
       *    CLD - Clear Decimal Flag
       */
      case 0xd8: {
        this.SR &= ~0x08;
        this.PC++;
        break;
      }
      /**
       *    CLI - Clear Interrupt Disable bit
       */
      case 0x58: {
        this.SR &= ~0x04;
        this.PC++;
        break;
      }
      /**
       *    CLV - Clear Overflow Flag
       */
      case 0xb8: {
        this.SR &= ~0x40;
        this.PC++;
        break;
      }
      /**
       *    CMP - Compare Memory with Accumulator
       */
      case 0xc9: {
        // CMP Immediate
        const value = this.read(this.PC++);
        this.cmp(value);
        break;
      }

      case 0xc5: {
        // CMP Zero Page
        const addr = this.read(this.PC++);
        this.cmp(this.read(addr));
        break;
      }

      case 0xd5: {
        // CMP Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.cmp(this.read(addr));
        break;
      }

      case 0xcd: {
        // CMP Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.cmp(this.read(addr));
        break;
      }

      case 0xdd: {
        // CMP Absolute,X
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        this.cmp(this.read(addr & 0xffff));
        break;
      }

      case 0xd9: {
        // CMP Absolute,Y
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        this.cmp(this.read(addr & 0xffff));
        break;
      }

      case 0xc1: {
        // CMP (Indirect,X)
        const zp = (this.read(this.PC++) + this.X) & 0xff;
        const lo = this.read(zp);
        const hi = this.read((zp + 1) & 0xff);
        const addr = (hi << 8) | lo;
        this.cmp(this.read(addr));
        break;
      }

      case 0xd1: {
        // CMP (Indirect),Y
        const zp = this.read(this.PC++);
        const lo = this.read(zp);
        const hi = this.read((zp + 1) & 0xff);
        const addr = ((hi << 8) | lo) + this.Y;
        this.cmp(this.read(addr & 0xffff));
        break;
      }

      /**
       *    CPX - Compare Memory and Index X
       */
      /**
       *    CPY - Compare Memory and Index Y
       */
      /**
       *    DEX - Decrement Index X by One
       */
      case 0xca: {
        // implied
        this.X = (this.X - 1) & 0xff;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    LDA - Load Accumulator with Memory
       */
      case 0xa9: {
        // LDA Immediate
        const value = this.read(this.PC++);
        this.A = value;
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xad: {
        // LDA Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.A = this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xa5: {
        // LDA Zero Page
        const addr = this.read(this.PC++);
        this.A = this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xb5: {
        // LDA Zero Page, X
        const base = this.read(this.PC++);
        const addr = (base + this.X) & 0xff;
        this.A = this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      /**
       *    INX - Increment Index X by one
       */
      case 0xe8: {
        this.X = (this.X + 1) & 0xff;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    LDX - Load Index X with Memory
       */
      case 0xa2: {
        // Immediate
        const value = this.read(this.PC++);
        this.X = value;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      case 0xae: {
        // LDX Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.X = this.read(addr);
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    JMP - Jump to New Location
       */
      case 0x4c: {
        // JMP Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        this.PC = (hi << 8) | lo;
        break;
      }
      /**
       *    STA - Store Accumulator in Memory
       */
      case 0x8d: {
        // STA Absolute
        // This reads the next 2 bytes as an address (low byte first), and writes
        // the contents of the accumulator (A) to that memory location.
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.write(addr, this.A);
        break;
      }
      /**
       *    STX - Store Index X in Memory
       */
      case 0x8e: {
        // STX Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.write(addr, this.X);
        break;
      }
      default:
        throw new Error(`Unimplemented opcode: ${opcode.toString(16)}`);
    }
  }
}
