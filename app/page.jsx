import Hero from '@/components/Hero';
import Activities from '@/components/Activities';
import FinderSection from '@/components/FinderSection';
import PlanTools from '@/components/PlanTools';
import TripsShowcase from '@/components/TripsShowcase';
import Gear from '@/components/Gear';
import Community from '@/components/Community';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Activities />
      <FinderSection />
      <PlanTools />
      <TripsShowcase />
      <Gear />
      <Community />
    </>
  );
}
