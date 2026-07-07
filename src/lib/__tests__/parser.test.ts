import { describe, expect, it } from 'vitest'
import { kaliteBul, olcuBul, parseSerbestMetin } from '../parser'
import { urunEslestir } from '../match'
import { ornekKatalog } from './ornekKatalog'

describe('parseSerbestMetin', () => {
  it('"imbus a2" → grup + kalite', () => {
    const i = parseSerbestMetin('imbus a2')
    expect(i.grup).toBe('İMBUS')
    expect(i.kalite).toBe('A2')
  })

  it('"933 8*30" → DIN 933 + ölçü/boy', () => {
    const i = parseSerbestMetin('933 8*30')
    expect(i.standart).toBe('DIN 933')
    expect(i.olcu).toBe(8)
    expect(i.boyMm).toBe(30)
  })

  it('"471/10" → SEGMAN standardı (X bilinen DIN)', () => {
    const i = parseSerbestMetin('471/10')
    expect(i.standart).toBe('DIN 471')
    expect(i.olcu).toBe(10)
  })

  it('"1/2" → inç (X bilinen DIN değil)', () => {
    const i = parseSerbestMetin('1/2 civata')
    expect(i.disTipi).toBe('inç')
    expect(i.boyutMetni).toBe('1/2"')
    expect(i.grup).toBe('CİVATA')
  })

  it('"somun 8" → SOMUN M8', () => {
    const i = parseSerbestMetin('somun 8')
    expect(i.grup).toBe('SOMUN')
    expect(i.olcu).toBe(8)
  })

  it('"m8*30" ve "M8x30" aynı', () => {
    expect(parseSerbestMetin('m8*30')).toMatchObject({ olcu: 8, boyMm: 30 })
    expect(parseSerbestMetin('M8x30')).toMatchObject({ olcu: 8, boyMm: 30 })
  })

  it('ondalık: "4,8*16"', () => {
    const i = parseSerbestMetin('4,8*16')
    expect(i.olcu).toBeCloseTo(4.8)
    expect(i.boyMm).toBe(16)
  })

  it('"din 933" ve "din933"', () => {
    expect(parseSerbestMetin('din 933').standart).toBe('DIN 933')
    expect(parseSerbestMetin('din933').standart).toBe('DIN 933')
  })
})

describe('kaliteBul / olcuBul', () => {
  it('açıklamadan kalite yakalar', () => {
    expect(kaliteBul('İMBUS CİVATA DIN 912 M8x30 A2')).toBe('A2')
    expect(kaliteBul('SOMUN DIN 934 M10 A4')).toBe('A4')
    expect(kaliteBul('VİDA 420 KALİTE M5')).toBe('420')
  })

  it('açıklamadan ölçü/boy yakalar', () => {
    expect(olcuBul('İMBUS M8X30 A2')).toEqual({ olcu: 8, boyMm: 30 })
    expect(olcuBul('SOMUN M10 A4')).toEqual({ olcu: 10, boyMm: null })
  })
})

describe('urunEslestir (örnek katalog üzerinde)', () => {
  const katalog = ornekKatalog().map((u, i) => ({ ...u, id: i + 1 }))

  it('"imbus a2" → yalnız İMBUS A2 döner', () => {
    const imza = parseSerbestMetin('imbus a2')
    const r = urunEslestir(katalog, imza, 'imbus a2')
    expect(r.urunler.length).toBeGreaterThan(0)
    expect(r.urunler.every((u) => u.grup === 'İMBUS' && u.kalite === 'A2')).toBe(true)
  })

  it('kalite STRICT: A2 ararken A4 çıkmaz', () => {
    const imza = parseSerbestMetin('civata a2')
    const r = urunEslestir(katalog, imza, 'civata a2', undefined, undefined, 1000)
    expect(r.urunler.some((u) => u.kalite === 'A4')).toBe(false)
  })

  it('"933 8*30" → DIN 933 M8x30 tam eşleşme önde', () => {
    const imza = parseSerbestMetin('933 8*30')
    const r = urunEslestir(katalog, imza, '933 8*30')
    expect(r.tamEslesme).toBe(true)
    expect(r.urunler[0].standart).toBe('DIN 933')
    expect(r.urunler[0].olcu).toBe(8)
    expect(r.urunler[0].boyMm).toBe(30)
  })

  it('"471/10" → mil segmanı bulunur', () => {
    const imza = parseSerbestMetin('471/10')
    const r = urunEslestir(katalog, imza, '471/10')
    expect(r.urunler[0].standart).toBe('DIN 471')
    expect(r.urunler[0].olcu).toBe(10)
  })

  it('sıralama: A2 → A4', () => {
    const imza = parseSerbestMetin('somun m8')
    const r = urunEslestir(katalog, imza, 'somun m8', undefined, undefined, 1000)
    const kaliteler = r.urunler.map((u) => u.kalite)
    const ilkA4 = kaliteler.indexOf('A4')
    const sonA2 = kaliteler.lastIndexOf('A2')
    if (ilkA4 !== -1 && sonA2 !== -1) expect(sonA2).toBeLessThan(ilkA4)
  })
})
