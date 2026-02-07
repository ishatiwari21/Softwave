"use client";

import StreamView from '../components/StreamView';

const creatorId = "5815f86b-6fbf-4089-938c-4c1c68d2edea"

export default function Dashboard() {
    return <StreamView creatorId={creatorId} playVideo={true} />
}