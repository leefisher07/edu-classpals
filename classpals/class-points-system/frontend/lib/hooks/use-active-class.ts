import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { classesApi } from '@/lib/api/classes';

/**
 * Hook to get the active class ID
 * Route classId takes highest priority for dashboard-scoped pages so class-switched views
 * always read data for the currently selected class.
 */
export function useActiveClass() {
  const user = useAuthStore((s) => s.user);
  const storeClassId = user?.currentClassId;

  const routeClassId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('classId') || undefined
    : undefined;

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
    enabled: !!user,
  });

  const classes: any[] = Array.isArray(classesData)
    ? classesData
    : Array.isArray((classesData as any)?.data)
      ? (classesData as any).data
      : [];

  const validRouteClassId = routeClassId && classes.some((c: any) => c.id === routeClassId)
    ? routeClassId
    : undefined;
  const validStoreClassId = storeClassId && classes.some((c: any) => c.id === storeClassId)
    ? storeClassId
    : undefined;

  const preferredClassId = validRouteClassId || validStoreClassId;
  const classFromId = preferredClassId
    ? classes.find((c: any) => c.id === preferredClassId)
    : undefined;
  const fallbackClass = !preferredClassId
    ? classes.find((c: any) => c.isActive) || classes[0]
    : undefined;
  const currentClass = classFromId || fallbackClass || (preferredClassId ? { id: preferredClassId } : undefined);
  const activeClassId = currentClass?.id;
  const isResolvingCurrentClass = !!preferredClassId && !classFromId && classes.length > 0;

  return {
    activeClassId,
    currentClass,
    classes,
    isLoading: classesLoading,
    isResolvingCurrentClass,
  };
}
