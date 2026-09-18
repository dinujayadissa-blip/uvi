'use client';
import { useAuth } from '@/components/AuthProvider';
import TripForm from '@/components/TripForm';

export default function NewTripPage() {
  const { configured, user, openAuth } = useAuth() || {};
  return (
    <div className="wrap page-wrap">
      <div className="page-head">
        <div>
          <h1>Share a trip</h1>
          <p>Post your route, story and photos for the community.</p>
        </div>
      </div>
      {!configured && (
        <p className="gate">Accounts aren&apos;t connected yet. Once Uvi&apos;s backend is live you&apos;ll be able to publish trips here.</p>
      )}
      {configured && !user && (
        <div className="gate">
          <p>Sign in to share a trip.</p>
          <button className="btn btn-primary" onClick={() => openAuth('signin')}>Sign in</button>
        </div>
      )}
      {configured && user && <TripForm />}
    </div>
  );
}
