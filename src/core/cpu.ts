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

  and(value: number) {
    this.A = this.A & value;
    this.setZeroAndNegativeFlags(this.A);
  }

  asl(value: number) {
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
      case 0x69: {
        const M = this.read(this.PC++);
        this.adc(M);
        break;
      }
      /**
       *            ADC
       */

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
       *  AND
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
       *    BRK
       */
      case 0x00: // BRK (Break)
        this.PC++;
        break;
      /**
       *    BCC
       */
      case 0x90: {
        // BCC
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
       *    BCS
       */
      // BCS - Branch if Carry Set
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
       *    BIT
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
       *    BMI
       */
      case 0x30: {
        // BMI
        const offset = this.read(this.PC++);
        if ((this.SR & 0x80) !== 0) {
          // Negative flag set
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BNE
       */
      case 0xd0: {
        // BNE
        const offset = this.read(this.PC++);
        if ((this.SR & 0x02) === 0) {
          // Zero flag clear
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BPL
       */
      case 0x10: {
        // BPL
        const offset = this.read(this.PC++);
        if ((this.SR & 0x80) === 0) {
          // Negative flag clear
          const signedOffset = offset < 0x80 ? offset : offset - 0x100;
          this.PC = (this.PC + signedOffset) & 0xffff;
        }
        break;
      }
      /**
       *    BEQ
       */

      // Branch if Zero Set
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
       *    LDA
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
      case 0xe8: {
        // INX
        // Increments the X register
        // Masks it to 8 bits
        // Updates Zero and Negative flags
        this.X = (this.X + 1) & 0xff;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      case 0xa2: {
        // LDX Immediate
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
      case 0x4c: {
        // JMP Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        this.PC = (hi << 8) | lo;
        break;
      }
      case 0x8e: {
        // STX Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.write(addr, this.X);
        break;
      }
      case 0xca: {
        // DEX
        this.X = (this.X - 1) & 0xff;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      case 0xf0: {
        // BEQ (Branch if Zero flag is set)
        const offset = this.read(this.PC++);
        if (this.SR & 0x02) {
          this.PC += offset < 0x80 ? offset : offset - 0x100; // signed 8-bit
        }
        break;
      }
      case 0xd0: {
        // BNE (Branch if Zero flag is clear)
        const offset = this.read(this.PC++);
        if (!(this.SR & 0x02)) {
          this.PC += offset < 0x80 ? offset : offset - 0x100; // signed 8-bit
        }
        break;
      }
      default:
        throw new Error(`Unimplemented opcode: ${opcode.toString(16)}`);
    }
  }
}
