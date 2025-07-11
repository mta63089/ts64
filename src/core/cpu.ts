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

  private cpx(value: number) {
    const result = (this.X - value) & 0xff;

    this.SR =
      (this.SR & ~0x83) | // Clear C, Z, N
      (this.X >= value ? 0x01 : 0) |
      (result === 0 ? 0x02 : 0) |
      (result & 0x80);
  }

  private cpy(value: number) {
    const result = (this.Y - value) & 0xff;

    this.SR =
      (this.SR & ~0x83) |
      (this.Y >= value ? 0x01 : 0) |
      (result === 0 ? 0x02 : 0) |
      (result & 0x80);
  }

  private eor(value: number) {
    this.A = this.A ^ value;
    this.setZeroAndNegativeFlags(this.A);
  }

  push(value: number) {
    this.write(0x0100 + this.SP, value);
    this.SP = (this.SP - 1) & 0xff;
  }

  pull(): number {
    this.SP = (this.SP + 1) & 0xff;
    return this.read(0x0100 + this.SP);
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

  private rotateLeft(value: number): number {
    const carryIn = this.SR & 0x01;
    const result = ((value << 1) | carryIn) & 0xff;
    this.SR = (this.SR & ~0x01) | (value & 0x80 ? 0x01 : 0);
    this.setZeroAndNegativeFlags(result);
    return result;
  }

  private rotateRight(value: number): number {
    const carryIn = (this.SR & 0x01) << 7;
    const result = ((value >> 1) | carryIn) & 0xff;
    this.SR = (this.SR & ~0x01) | (value & 0x01);
    this.setZeroAndNegativeFlags(result);
    return result;
  }

  private sbc(value: number) {
    const inverted = value ^ 0xff;

    const sum = this.A + inverted + (this.SR & 0x01);
    const result = sum & 0xff;

    // Set carry if no borrow occurred
    if (sum > 0xff) this.SR |= 0x01;
    else this.SR &= ~0x01;

    // Overflow: if sign bit changed incorrectly
    const overflow = ~(this.A ^ inverted) & (this.A ^ result) & 0x80;
    if (overflow) this.SR |= 0x40;
    else this.SR &= ~0x40;

    this.A = result;
    this.setZeroAndNegativeFlags(this.A);
  }

  private setFlag(flag: "C" | "Z" | "N", value: number) {
    const mask = { C: 0x01, Z: 0x02, N: 0x80 }[flag];
    if (value) this.SR |= mask;
    else this.SR &= ~mask;
  }

  write(addr: number, value: number) {
    this.memory[addr] = value;
  }

  readWord(addr: number) {
    const lo = this.read(addr);
    const hi = this.read(addr + 1);
    return (hi << 8) | lo;
  }

  readWordAtPC(): number {
    const lo = this.read(this.PC++);
    const hi = this.read(this.PC++);
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
      case 0xe0: {
        // Immediate
        this.cpx(this.read(this.PC++));
        break;
      }
      case 0xe4: {
        // Zero Page
        const addr = this.read(this.PC++);
        this.cpx(this.read(addr));
        break;
      }
      case 0xec: {
        // Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.cpx(this.read(addr));
        break;
      }
      /**
       *    CPY - Compare Memory and Index Y
       */
      case 0xc0: {
        // Immediate
        this.cpy(this.read(this.PC++));
        break;
      }
      case 0xc4: {
        // Zero Page
        const addr = this.read(this.PC++);
        this.cpy(this.read(addr));
        break;
      }
      case 0xcc: {
        // Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.cpy(this.read(addr));
        break;
      }
      /**
       *    DEC - Decrement Memory by One
       */
      case 0xc6: {
        // DEC Zero Page
        const addr = this.read(this.PC++);
        const value = (this.read(addr) - 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      case 0xd6: {
        // DEC Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = (this.read(addr) - 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      case 0xce: {
        // DEC Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const value = (this.read(addr) - 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      case 0xde: {
        // DEC Absolute,X
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const value = (this.read(addr & 0xffff) - 1) & 0xff;
        this.write(addr & 0xffff, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

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
       *    DEY - Decrement Index Y by One
       */
      case 0x88: {
        this.Y = (this.Y - 1) & 0xff;
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }

      /**
       *    EOR - Exclusive-OR Memory with Accumulator
       */
      // EOR Immediate
      case 0x49: {
        const value = this.read(this.PC++);
        this.eor(value);
        break;
      }

      // EOR Zero Page
      case 0x45: {
        const addr = this.read(this.PC++);
        this.eor(this.read(addr));
        break;
      }

      // EOR Zero Page,X
      case 0x55: {
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.eor(this.read(addr));
        break;
      }

      // EOR Absolute
      case 0x4d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.eor(this.read(addr));
        break;
      }

      // EOR Absolute,X
      case 0x5d: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        this.eor(this.read(addr & 0xffff));
        break;
      }

      // EOR Absolute,Y
      case 0x59: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        this.eor(this.read(addr & 0xffff));
        break;
      }

      // EOR (Indirect,X)
      case 0x41: {
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = (hi << 8) | lo;
        this.eor(this.read(addr));
        break;
      }

      // EOR (Indirect),Y
      case 0x51: {
        const zpAddr = this.read(this.PC++);
        const lo = this.read(zpAddr);
        const hi = this.read((zpAddr + 1) & 0xff);
        const addr = ((hi << 8) | lo) + this.Y;
        this.eor(this.read(addr & 0xffff));
        break;
      }

      /**
       *    INC - Increment Memory by One
       */
      case 0xe6: {
        const addr = this.read(this.PC++);
        const value = (this.read(addr) + 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      // INC Zero Page,X
      case 0xf6: {
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = (this.read(addr) + 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      // INC Absolute
      case 0xee: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const value = (this.read(addr) + 1) & 0xff;
        this.write(addr, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }

      // INC Absolute,X
      case 0xfe: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const value = (this.read(addr & 0xffff) + 1) & 0xff;
        this.write(addr & 0xffff, value);
        this.setZeroAndNegativeFlags(value);
        break;
      }
      /**
       *    INX - Increment Index X by One
       */
      case 0xe8: {
        this.X = (this.X + 1) & 0xff;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    INY - Increment Index Y by One
       */
      case 0xc8: {
        this.Y = (this.Y + 1) & 0xff;
        this.setZeroAndNegativeFlags(this.Y);
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
      // JMP Indirect (bug-compatible with 6502 page wrap)
      case 0x6c: {
        const ptrLo = this.read(this.PC++);
        const ptrHi = this.read(this.PC++);
        const ptr = (ptrHi << 8) | ptrLo;

        const lo = this.read(ptr);
        const hi = this.read((ptr & 0xff00) | ((ptr + 1) & 0x00ff)); // Bug emulation
        this.PC = (hi << 8) | lo;
        break;
      }
      /**
       *    JSR - Jump to New Location Saving Return Address
       */
      case 0x20: {
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const returnAddr = this.PC - 1;
        this.push((returnAddr >> 8) & 0xff); // High byte
        this.push(returnAddr & 0xff); // Low byte
        this.PC = addr;
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
      case 0xbd: {
        // LDA Absolute,X
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        this.A = this.read(addr & 0xffff);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xb9: {
        // LDA Absolute,Y
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        this.A = this.read(addr & 0xffff);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xa1: {
        // LDA (Indirect,X)
        const zp = (this.read(this.PC++) + this.X) & 0xff;
        const lo = this.read(zp);
        const hi = this.read((zp + 1) & 0xff);
        const addr = (hi << 8) | lo;
        this.A = this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0xb1: {
        // LDA (Indirect),Y
        const zp = this.read(this.PC++);
        const lo = this.read(zp);
        const hi = this.read((zp + 1) & 0xff);
        const addr = ((hi << 8) | lo) + this.Y;
        this.A = this.read(addr & 0xffff);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }

      /**
       *    LDX - Load Index X with Memory
       */
      case 0xa2: {
        // LDX Immediate
        const value = this.read(this.PC++);
        this.X = value;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      case 0xa6: {
        // LDX Zero Page
        const addr = this.read(this.PC++);
        this.X = this.read(addr);
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      case 0xb6: {
        // LDX Zero Page,Y
        const addr = (this.read(this.PC++) + this.Y) & 0xff;
        this.X = this.read(addr);
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
      case 0xbe: {
        // LDX Absolute,Y
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.Y;
        this.X = this.read(addr & 0xffff);
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    LDY - Load Index Y with Memory
       */
      case 0xa0: {
        // LDY Immediate
        const value = this.read(this.PC++);
        this.Y = value;
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      case 0xa4: {
        // LDY Zero Page
        const addr = this.read(this.PC++);
        this.Y = this.read(addr);
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      case 0xb4: {
        // LDY Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.Y = this.read(addr);
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      case 0xac: {
        // LDY Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        this.Y = this.read(addr);
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      case 0xbc: {
        // LDY Absolute,X
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        this.Y = this.read(addr & 0xffff);
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      /**
       *    LSR - Logical Shift Right
       */
      case 0x4a: {
        // LSR Accumulator
        const carry = this.A & 0x01;
        this.setFlag("C", carry);
        this.A = this.A >> 1;
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x46: {
        // LSR Zero Page
        const addr = this.read(this.PC++);
        const value = this.read(addr);
        const carry = value & 0x01;
        const result = value >> 1;
        this.setFlag("C", carry);
        this.write(addr, result);
        this.setZeroAndNegativeFlags(result);
        break;
      }
      case 0x56: {
        // LSR Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = this.read(addr);
        const carry = value & 0x01;
        const result = value >> 1;
        this.setFlag("C", carry);
        this.write(addr, result);
        this.setZeroAndNegativeFlags(result);
        break;
      }
      case 0x4e: {
        // LSR Absolute
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = (hi << 8) | lo;
        const value = this.read(addr);
        const carry = value & 0x01;
        const result = value >> 1;
        this.setFlag("C", carry);
        this.write(addr, result);
        this.setZeroAndNegativeFlags(result);
        break;
      }
      case 0x5e: {
        // LSR Absolute,X
        const lo = this.read(this.PC++);
        const hi = this.read(this.PC++);
        const addr = ((hi << 8) | lo) + this.X;
        const value = this.read(addr & 0xffff);
        const carry = value & 0x01;
        const result = value >> 1;
        this.setFlag("C", carry);
        this.write(addr & 0xffff, result);
        this.setZeroAndNegativeFlags(result);
        break;
      }
      /**
       *    ORA - OR Memory with Accumulator
       */
      case 0x09: {
        // ORA Immediate
        const value = this.read(this.PC++);
        this.A |= value;
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x05: {
        // ORA Zero Page
        const addr = this.read(this.PC++);
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x15: {
        // ORA Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x0d: {
        // ORA Absolute
        const addr = this.readWordAtPC();
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x1d: {
        // ORA Absolute,X
        const addr = (this.readWordAtPC() + this.X) & 0xffff;
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x19: {
        // ORA Absolute,Y
        const addr = (this.readWordAtPC() + this.Y) & 0xffff;
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x01: {
        // ORA (Indirect,X)
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const addr = this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8);
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      case 0x11: {
        // ORA (Indirect),Y
        const zpAddr = this.read(this.PC++);
        const baseAddr =
          this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8);
        const addr = (baseAddr + this.Y) & 0xffff;
        this.A |= this.read(addr);
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      /**
       *    PHA - Push Accumulator on Stack
       */
      case 0x48: {
        // PHA - Push Accumulator
        this.push(this.A);
        break;
      }

      /**
       *    PHP - Push Processor Status on Stack
       */
      case 0x08: {
        // PHP - Push Processor Status
        this.push(this.SR | 0x30); // Set bits 4 and 5 (B + unused)
        break;
      }
      /**
       *    PLA - Pull Accumulator from Stack
       */
      case 0x68: {
        // PLA - Pull Accumulator
        this.A = this.pull();
        this.setZeroAndNegativeFlags(this.A);
        break;
      }
      /**
       *    PLP - Pull Processor Status from Stack
       */
      case 0x28: {
        // PLP - Pull Processor Status
        this.SR = (this.pull() & 0xef) | 0x20; // Clear bit 4 (break), set bit 5 (unused)
        break;
      }
      /**
       *    ROL - Rotate one Bit Left
       */
      case 0x2a: // ROL A
        this.A = this.rotateLeft(this.A);
        break;

      case 0x26: {
        // ROL zeropage
        const addr = this.read(this.PC++);
        const value = this.read(addr);
        this.write(addr, this.rotateLeft(value));
        break;
      }

      case 0x36: {
        // ROL zeropage,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = this.read(addr);
        this.write(addr, this.rotateLeft(value));
        break;
      }

      case 0x2e: {
        // ROL absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        const value = this.read(addr);
        this.write(addr, this.rotateLeft(value));
        break;
      }

      case 0x3e: {
        // ROL absolute,X
        const addr = (this.readWord(this.PC) + this.X) & 0xffff;
        this.PC += 2;
        const value = this.read(addr);
        this.write(addr, this.rotateLeft(value));
        break;
      }
      /**
       *    ROR - Rotate one Bit Right
       */
      case 0x6a: // ROR A
        this.A = this.rotateRight(this.A);
        break;

      case 0x66: {
        // ROR zeropage
        const addr = this.read(this.PC++);
        const value = this.read(addr);
        this.write(addr, this.rotateRight(value));
        break;
      }

      case 0x76: {
        // ROR zeropage,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = this.read(addr);
        this.write(addr, this.rotateRight(value));
        break;
      }

      case 0x6e: {
        // ROR absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        const value = this.read(addr);
        this.write(addr, this.rotateRight(value));
        break;
      }

      case 0x7e: {
        // ROR absolute,X
        const addr = (this.readWord(this.PC) + this.X) & 0xffff;
        this.PC += 2;
        const value = this.read(addr);
        this.write(addr, this.rotateRight(value));
        break;
      }
      /**
       *    RTI - Return from Interrupt
       */
      /**
       *    RTS - Return from Subroutine
       */
      case 0x60: {
        const lo = this.pull();
        const hi = this.pull();
        this.PC = (((hi << 8) | lo) + 1) & 0xffff;
        break;
      }
      /**
       *    SBC - Subtract Memory from Accumulator with Borrow
       */
      case 0xe9: {
        // SBC Immediate
        const value = this.read(this.PC++);
        this.sbc(value);
        break;
      }
      case 0xe5: {
        // SBC Zero Page
        const addr = this.read(this.PC++);
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xf5: {
        // SBC Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xed: {
        // SBC Absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xfd: {
        // SBC Absolute,X
        const addr = (this.readWord(this.PC) + this.X) & 0xffff;
        this.PC += 2;
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xf9: {
        // SBC Absolute,Y
        const addr = (this.readWord(this.PC) + this.Y) & 0xffff;
        this.PC += 2;
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xe1: {
        // SBC (Indirect,X)
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const addr = this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8);
        const value = this.read(addr);
        this.sbc(value);
        break;
      }
      case 0xf1: {
        // SBC (Indirect),Y
        const zpAddr = this.read(this.PC++);
        const addr =
          (this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8)) + this.Y;
        const value = this.read(addr & 0xffff);
        this.sbc(value);
        break;
      }

      /**
       *    SEC - Set Carry Flag
       */
      case 0x38: {
        this.SR |= 0x01; // Set Carry flag
        break;
      }
      /**
       *    SED - Set Decimal Flag
       */
      case 0xf8: {
        this.SR |= 0x08; // Set Decimal flag
        break;
      }
      /**
       *    SEI - Set Interrupt Disable Status
       */
      case 0x78: {
        this.SR |= 0x04; // Set Interrupt Disable flag
        break;
      }
      /**
       *    STA - Store Accumulator in Memory
       */
      case 0x85: {
        // STA Zero Page
        const addr = this.read(this.PC++);
        this.write(addr, this.A);
        break;
      }
      case 0x95: {
        // STA Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.write(addr, this.A);
        break;
      }
      case 0x8d: {
        // STA Absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        this.write(addr, this.A);
        break;
      }
      case 0x9d: {
        // STA Absolute,X
        const addr = (this.readWord(this.PC) + this.X) & 0xffff;
        this.PC += 2;
        this.write(addr, this.A);
        break;
      }
      case 0x99: {
        // STA Absolute,Y
        const addr = (this.readWord(this.PC) + this.Y) & 0xffff;
        this.PC += 2;
        this.write(addr, this.A);
        break;
      }
      case 0x81: {
        // STA (Indirect,X)
        const zpAddr = (this.read(this.PC++) + this.X) & 0xff;
        const addr = this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8);
        this.write(addr, this.A);
        break;
      }
      case 0x91: {
        // STA (Indirect),Y
        const zpAddr = this.read(this.PC++);
        const addr =
          (this.read(zpAddr) | (this.read((zpAddr + 1) & 0xff) << 8)) + this.Y;
        this.write(addr & 0xffff, this.A);
        break;
      }

      /**
       *    STX - Store Index X in Memory
       */
      case 0x86: {
        // Zero Page
        const addr = this.read(this.PC++);
        this.write(addr, this.X);
        break;
      }
      case 0x96: {
        // Zero Page,Y
        const addr = (this.read(this.PC++) + this.Y) & 0xff;
        this.write(addr, this.X);
        break;
      }
      case 0x8e: {
        // Absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        this.write(addr, this.X);
        break;
      }
      /**
       *    STY - Sore Index Y in Memory
       */
      case 0x84: {
        // Zero Page
        const addr = this.read(this.PC++);
        this.write(addr, this.Y);
        break;
      }
      case 0x94: {
        // Zero Page,X
        const addr = (this.read(this.PC++) + this.X) & 0xff;
        this.write(addr, this.Y);
        break;
      }
      case 0x8c: {
        // Absolute
        const addr = this.readWord(this.PC);
        this.PC += 2;
        this.write(addr, this.Y);
        break;
      }
      /**
       *    TAX - Transfer Accumulator to Index X
       */
      case 0xaa: {
        this.X = this.A;
        this.setZeroAndNegativeFlags(this.X);
        break;
      }
      /**
       *    TAY - Transfer Accumulator to Index Y
       */
      case 0xa8: {
        this.Y = this.A;
        this.setZeroAndNegativeFlags(this.Y);
        break;
      }
      /**
       *    TSX - Transfer Stack Pointer to Index X
       */
      /**
       *    TXA - Transfer Index X to Accumulator
       */
      /**
       *    TXS - Transfer Index X to Stack Register
       */
      /**
       *    TYA - Transfer Index Y to Accumulator
       */
      default:
        throw new Error(`Unimplemented opcode: ${opcode.toString(16)}`);
    }
  }
}
