// Catálogo de cursos do app: os da Pythonando (courses.json), os de outras plataformas
// (courses-extra.json) e os que você adicionou pelo app (guardados no banco).

import type { CatalogCourse, CourseCatalog } from '@/lib/types';
import extra from './courses-extra.json';
import { courseCatalog } from './season1';

export const extraCourses = (extra as unknown as CourseCatalog).courses;

/** Pythonando + outras plataformas (sem os adicionados no app). */
export const baseCatalog: CourseCatalog = { courses: [...courseCatalog.courses, ...extraCourses] };

/** Catálogo completo com os cursos adicionados no app (os do código ganham em caso de slug repetido). */
export function mergeCatalog(custom: CatalogCourse[]): CourseCatalog {
  const taken = new Set(baseCatalog.courses.map((c) => c.slug));
  return {
    courses: [...baseCatalog.courses, ...custom.filter((c) => !taken.has(c.slug)).map((c) => ({ ...c, custom: true }))],
  };
}
