import { redirect } from 'next/navigation';

// Trang này chỉ redirect nên không có UI để validate instant.
export const instant = false;

export default function RootPage() {
  redirect('/tasks');
}
