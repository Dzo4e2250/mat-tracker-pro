import { UserProfileMenu } from "@/components/UserProfileMenu";

export function ProdajalecHeader() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-10">
      <h1 className="text-xl font-semibold">Prodajalec Dashboard</h1>
      <UserProfileMenu />
    </header>
  );
}
