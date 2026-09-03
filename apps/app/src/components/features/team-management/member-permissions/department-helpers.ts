import type { OrgDepartment } from '@/lib/schemas/org-structure';

export function parentNameOf(departmentId: string, departmentMap: Map<string, OrgDepartment>): string | null {
  const parentId = departmentMap.get(departmentId)?.parentDepartmentId;

  if (!parentId) {
    return null;
  }

  return departmentMap.get(parentId)?.name ?? null;
}

export function departmentSubtitle(parentName: string | null, hasChildren: boolean): string | null {
  if (parentName) {
    return `Under ${parentName}`;
  }

  if (hasChildren) {
    return 'Includes teams';
  }

  return null;
}

export function addOptionSubtitle(parentName: string | null, hasChildren: boolean): string {
  if (parentName) {
    return ` · under ${parentName}`;
  }

  if (hasChildren) {
    return ' · includes teams';
  }

  return '';
}
