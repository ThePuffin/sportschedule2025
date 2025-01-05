import { ThemedText } from '@/components/ThemedText';

const fetchData = async () => {
  const resp = await fetch('https://dummyjson.com/users');
  const user = await resp.json();
  if (user?.users && user.users.length) {
    const { firstName, LastName } = user.users[0];
    return `${firstName} ${LastName}`;
  }
  return '';
};

export function DataFetching() {
  const user = 'fetchData()';
  return <ThemedText type="title">Welcome to sportSchedule!</ThemedText>;
}
