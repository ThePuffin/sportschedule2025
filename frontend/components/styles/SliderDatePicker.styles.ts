import { StyleSheet } from 'react-native';

/**
 * Static styles for the SliderDatePicker component.
 * Dynamic (theme / favorite color / state dependent) styles remain inline in
 * the component's JSX — only static values belong here.
 */
export const SliderDatePickerStyles = StyleSheet.create({
  searchButton: {
    position: 'absolute',
    left: 15,
    top: 35, // vertically centered between the month row (ends at y=50) and the day row (starts at y=60): midpoint y=55, button height 40 → top=35
    width: 40,
    height: 40,
    borderRadius: '50%',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // sits above the month/days rows
  },
  container: {
    paddingVertical: 10,
    position: 'relative', // anchor for the absolutely-positioned search button
  },
  monthContainer: {
    marginBottom: 10,
    height: 40,
    paddingLeft: 50, // 10px gap after the floating search button (button ends at x=55) — matches TeamFilter's marginRight:10 on its loupe
  },
  monthItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateItem: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginTop: 4,
  },
});