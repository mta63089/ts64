export class Bus {
  ram = new Uint8Array(0x10000);

  read(addr: number): number {
    return this.ram[addr & 0xffff];
  }
  write(addr: number, value: number) {
    this.ram[addr & 0xffff] = value & 0xff;
  }
  loadROM(start: number, bytes: Uint8Array) {
    this.ram.set(bytes, start);
  }
}
