"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Play, Share2, Check } from "lucide-react";
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { YT_REGEX } from '@/app/lib/utils';
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
import { toast } from "react-toastify";
import { Appbar } from './Appbar';
//@ts-ignore
import YouTubePlayer from 'youtube-player'



interface Video {
    id: string;
    type: string;
    extractedId: string;
    title: string;
    smallImg: string;
    bigImg: string;
    active: boolean;
    upvotes: number;
    downvotes: number;
    url: string;
    haveUpvoted: boolean;
    thumbnail: string;
}

const REFRESH_INTERVAL_MS = 10 * 1000;


export default function StreamView({
    creatorId,
    playVideo = false
}: {
    creatorId: string,
    playVideo?: boolean
}) {

    const session = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session.status === "unauthenticated") {
            router.push("/");
        }
    }, [session.status, router]);

    const [inputLink, setInputLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [queue, setQueue] = useState<Video[]>([]);
    const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(false);
    const [playNextLoader, setPlayNextLoader] = useState(false);
    const videoPlayerRef = useRef<HTMLDivElement>(null);



    async function refreshStream() {

        const res = await fetch(`/api/streams?creatorId=${creatorId}`, {
            credentials: "include"
        });
        const json = await res.json();
        setQueue((json.streams || []).map((s: any) => ({
            ...s,
            thumbnail: s.smallImg,
            downvotes: 0,
            haveUpvoted: s.haveUpvoted
        })).sort((a: any, b: any) => a.upvotes < b.upvotes ? 1 : -1));
        setCurrentVideo((json.activeStream?.stream as unknown as Video) || null);

    }

    useEffect(() => {
        refreshStream();
        const interval = setInterval(() => {
            refreshStream();
        }, REFRESH_INTERVAL_MS)
    }, [])

    useEffect(() => {
        if (!videoPlayerRef.current || !currentVideo) return;

        let player = YouTubePlayer(videoPlayerRef.current);

        player.loadVideoById(currentVideo.extractedId);
        player.playVideo();

        function eventHandler(event: any) {
            if (event.data === 0) {
                playNext();
            }
        }

        player.on('stateChange', eventHandler);

        return () => {
            player.destroy();
        }
    }, [currentVideo?.id, videoPlayerRef])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/streams", {
                method: "POST",
                body: JSON.stringify({
                    creatorId,
                    url: inputLink.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                console.error("Failed to add stream:", data.message);
                return;
            }
            setQueue([...queue, {
                ...data,
                thumbnail: data.smallImg,
                downvotes: 0,
                haveUpvoted: false
            }]);
            setLoading(false);
            setInputLink("");
        } catch (e) {
            console.error("Error adding stream:", e);
        }
    }

    const handleVote = (id: string, isUpvote: boolean) => {
        setQueue(
            queue.map(video =>
                video.id === id
                    ? {
                        ...video,
                        upvotes: isUpvote ? video.upvotes + 1 : video.upvotes - 1,
                        haveUpvoted: !video.haveUpvoted
                    }
                    : video
            ).sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
        );
        fetch(`/api/streams/${isUpvote ? "upvote" : "downvote"}`, {
            method: "POST",
            body: JSON.stringify({
                streamId: id
            })
        })
    };

    const playNext = async () => {
        try {
            setPlayNextLoader(true);
            const data = await fetch('/api/streams/next', {
                method: "GET",
            })
            const json = await data.json();

            if (json.stream) {
                setCurrentVideo(json.stream as Video);
            } else {
                setCurrentVideo(null);
            }
        }
        catch (e) {
            console.error("Error while playing next video", e);
        }
        setPlayNextLoader(false);

    };

    const handleShare = () => {
        const shareableLink = `${window.location.origin}/creator/${creatorId}`;

        navigator.clipboard.writeText(shareableLink).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                toast.success("Link copied to clipboard!", {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            },
            (err) => {
                console.error("Could not copy text: ", err);
                toast.error("Failed to copy link. Please try again.", {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        );
    };


    return (
        <div className="min-h-screen bg-black text-white p-6">
            <Appbar />
            <div className="flex justify-center px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 w-full max-w-screen-xl pt-8">
                    <div className='col-span-3'>

                        {/* Left Column: Upcoming Songs */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">Upcoming Songs</h2>
                            {queue.length === 0 ? (
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardContent className="p-12 text-center">
                                        <p className="text-gray-500">No songs in queue. Add one above!</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {queue.map((video) => (
                                        <Card key={video.id} className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all">
                                            <CardContent className="p-6 flex items-center gap-4">
                                                <img
                                                    src={video.thumbnail}
                                                    alt={`Thumbnail for ${video.title}`}
                                                    className="w-32 h-24 object-cover rounded bg-gray-800"
                                                />
                                                <div className="flex-grow">
                                                    <h3 className="font-semibold text-white text-lg mb-3">{video.title}</h3>
                                                    <div className="flex items-center gap-3">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleVote(video.id, video.haveUpvoted ? false : true)}
                                                            className="flex items-center gap-2 bg-transparent border-gray-700 hover:bg-gray-800 text-white"
                                                        >
                                                            {video.haveUpvoted ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                                            <span>{video.upvotes}</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Creator Actions & Now Playing */}
                    <div className='col-span-2'>
                        <div className="space-y-6">
                            {/* Header with Share Button */}
                            <div className="flex justify-between items-center">
                                <h1 className="text-3xl font-bold text-white">Add a song</h1>
                                <Button
                                    onClick={handleShare}
                                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="h-4 w-4" />
                                            Share
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Add Song Form */}
                            <div className="space-y-4">
                                <Input
                                    type="text"
                                    placeholder="Paste YouTube link here"
                                    value={inputLink}
                                    onChange={(e) => setInputLink(e.target.value)}
                                    className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 h-12"
                                />
                                <Button
                                    disabled={loading} onClick={handleSubmit}
                                    className="w-full bg-blue-700 hover:bg-blue-800 text-white h-12 text-lg font-semibold"
                                >
                                    {loading ? "Loading..." : "Add to Queue"}
                                </Button>
                            </div>

                            {/* Preview Card */}
                            {inputLink && inputLink.match(YT_REGEX) && !loading && (
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardContent className="p-4">
                                        <LiteYouTubeEmbed
                                            title=""
                                            id={inputLink.match(YT_REGEX)?.[1] || ""}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Now Playing */}
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardContent className="p-4">
                                        {currentVideo ? (
                                            <div>
                                                {playVideo ? <>
                                                    {/*@ts-ignore*/}
                                                    <div ref={videoPlayerRef} className='w-full h-72'></div>
                                                    {/*<iframe width={"100%"} height={"100%"} src={`https://www.youtube.com/embed/${currentVideo.extractedId}?autoplay=1`}
                                                        allow='autoplay'></iframe>*/}
                                                </> : <>
                                                    <img
                                                        src={currentVideo.bigImg || currentVideo.thumbnail}
                                                        alt="Current video"
                                                        className="w-full h-72 object-cover rounded"
                                                    />
                                                    <p className="mt-2 text-center font-semibold text-white">{currentVideo.title}</p>
                                                </>}
                                            </div>) : (
                                            <div className="text-center py-16">
                                                <p className="text-gray-500 text-lg">No video playing</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {playVideo && <Button disabled={playNextLoader}
                                    onClick={playNext}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-semibold"
                                >{playNextLoader ? "Loading..." : "Play Next"}
                                    <Play className="mr-2 h-5 w-5" />

                                </Button>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}