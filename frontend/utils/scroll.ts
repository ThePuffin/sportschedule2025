export const getScheduleScrollOffset = ({
  isSmallDevice,
  filtersHeaderHeight = 0,
}: {
  isSmallDevice: boolean;
  filtersHeaderHeight?: number;
}) => {
  const mobileBaseOffset = 220;
  const desktopBaseOffset = 320;

  if (isSmallDevice) {
    return Math.max(mobileBaseOffset, mobileBaseOffset + Math.max(0, filtersHeaderHeight - mobileBaseOffset));
  }

  return desktopBaseOffset;
};
