import { describe, expect, it } from 'vitest';
import { bandCodeSchema, bandPasswordSchema, createCodeBandSchema, pinSchema } from '../src/lib/band-login-validation';

describe('band credentials', () => {
  it('accepts four-character shared passwords and rejects shorter ones throughout band creation', () => {
    const fields = { name: '밴드', nickname: '멤버', part: '기타', pin: '001234', admin_pin: '567890' };
    expect(bandPasswordSchema.parse('1234')).toBe('1234');
    expect(createCodeBandSchema.safeParse({ ...fields, password: '1234' }).success).toBe(true);
    for (const password of ['', '1', '12', '123']) {
      expect(bandPasswordSchema.safeParse(password).success).toBe(false);
      expect(createCodeBandSchema.safeParse({ ...fields, password }).success).toBe(false);
    }
  });

  it('removes credential whitespace while preserving internal password spaces', () => {
    expect(bandCodeSchema.parse(' ab12cd34ef ')).toBe('AB12CD34EF');
    expect(bandPasswordSchema.parse(' password ')).toBe('password');
    expect(pinSchema.parse(' 00 12\t34\n')).toBe('001234');
    expect(bandCodeSchema.parse(' ab12 cd34 ef ')).toBe('AB12CD34EF');
    expect(bandPasswordSchema.parse(' pass word ')).toBe('pass word');
    expect(bandCodeSchema.safeParse('unknown-band').success).toBe(false);
  });
  it('preserves leading zeroes in six-digit member PINs', () => {
    expect(pinSchema.parse('001234')).toBe('001234');
    for (const value of ['12345', '1234567', 'abcdef', '１２３４５６', '123 45']) {
      expect(pinSchema.safeParse(value).success).toBe(false);
    }
  });
  it('rejects bcrypt-truncated passwords including long multibyte input', () => {
    expect(bandPasswordSchema.safeParse('x'.repeat(65)).success).toBe(false);
    expect(bandPasswordSchema.safeParse('가'.repeat(25)).success).toBe(false);
    expect(bandPasswordSchema.safeParse('가'.repeat(24)).success).toBe(true);
  });
  it('requires distinct personal and administrator PINs when creating a band', () => {
    const fields = { name: '우리 밴드', nickname: '기타', part: '기타', password: 'band-password', pin: '001234', admin_pin: '001234' };
    expect(createCodeBandSchema.safeParse(fields).success).toBe(false);
    expect(createCodeBandSchema.safeParse({ ...fields, admin_pin: '567890' }).success).toBe(true);
  });
});
