import { Hero } from "@/components/sections/hero";
import { Manifesto } from "@/components/sections/manifesto";
import { CourseCatalog } from "@/components/sections/course-catalog";
import { StudentWall } from "@/components/sections/student-wall";
import { FriendLinks } from "@/components/sections/friend-links";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Manifesto />
      <CourseCatalog />
      <StudentWall />
      <FriendLinks />
    </>
  );
}
