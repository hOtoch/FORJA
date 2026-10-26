import { describe, expect, it } from 'vitest';
import { CUSTOM_ID_BASE, maxCustomLessonId, parseDuration, parseLessons, slugFor } from './course-import';

const ids = () => {
  let n = 0;
  return () => ++n;
};

describe('importar a lista de aulas', () => {
  it('lê durações em vários formatos', () => {
    expect(parseDuration('12:34')).toBe(13);
    expect(parseDuration('1:02:03')).toBe(62);
    expect(parseDuration('20 min')).toBe(20);
    expect(parseDuration('1h05')).toBe(65);
    expect(parseDuration('1h 5min')).toBe(65);
    expect(parseDuration('(02:27)')).toBe(2);
    expect(parseDuration('Introdução')).toBeNull();
  });

  it('formato simples: # para módulos e a duração no fim da linha', () => {
    const r = parseLessons(
      ['# Fundamentos', 'O que é Cloud | 12:34', 'Criando a conta - 20 min', '', '# Segurança', 'IAM na prática (1h05)', 'Sem duração'].join('\n'),
      ids(),
    );
    expect(r.modules).toEqual([
      { name: 'Fundamentos', min: 33, lessons: [[1, 'O que é Cloud', 13], [2, 'Criando a conta', 20]] },
      { name: 'Segurança', min: 65, lessons: [[3, 'IAM na prática', 65], [4, 'Sem duração', 0]] },
    ]);
    expect(r).toMatchObject({ lessons: 4, minutes: 98 });
  });

  it('texto copiado da grade da Udemy: seção, contagem e a duração na linha de baixo', () => {
    const udemy = [
      'Seção 1: Iniciando',
      '6 aulas • 1h 54min',
      'Boas Vindas ao Curso',
      'Visualizar',
      '02:27',
      'O segredo desse curso',
      '10:13',
      'Seção 2: AWS S3',
      'Criando Buckets e Acessando Classes no S3',
      '37:51',
    ].join('\n');
    const r = parseLessons(udemy, ids());
    expect(r.modules.map((m) => m.name)).toEqual(['Iniciando', 'AWS S3']);
    expect(r.modules[0].lessons).toEqual([
      [1, 'Boas Vindas ao Curso', 2],
      [2, 'O segredo desse curso', 10],
    ]);
    expect(r.modules[1].lessons[0][2]).toBe(38);
  });

  it('sem módulo, as aulas vão para "Aulas"', () => {
    const r = parseLessons('Aula 1\nAula 2 | 5:00', ids());
    expect(r.modules).toEqual([{ name: 'Aulas', min: 5, lessons: [[1, 'Aula 1', 0], [2, 'Aula 2', 5]] }]);
  });

  it('slug sem acento e sem repetir', () => {
    expect(slugFor('Certificação AWS: Cloud', new Set())).toBe('certificacao-aws-cloud');
    expect(slugFor('Docker', new Set(['docker']))).toBe('docker-2');
  });

  it('ids dos cursos adicionados continuam de onde pararam', () => {
    expect(maxCustomLessonId([])).toBe(CUSTOM_ID_BASE);
    expect(
      maxCustomLessonId([{ slug: 'a', name: 'A', modules: [{ name: 'M', min: 0, lessons: [[CUSTOM_ID_BASE + 7, 'x', 0]] }] }]),
    ).toBe(CUSTOM_ID_BASE + 7);
  });
});
