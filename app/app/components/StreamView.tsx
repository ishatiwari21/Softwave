"use client";
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Play, Share2, Check } from "lucide-react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { YT_REGEX } from '@/app/lib/utils';
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
import { toast } from "react-toastify";
import { Appbar } from './Appbar';

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
    const playerRef = useRef<any>(null);

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

        return () => clearInterval(interval);
    }, [])

    // 1. Load YouTube IFrame API script once
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // 2. Initialize or update player when currentVideo changes
    useEffect(() => {
        if (!currentVideo || !playVideo || !videoPlayerRef.current) return;

        // If player doesn't exist yet, but YT API is loaded, create it
        if (!playerRef.current && window.YT && window.YT.Player) {
            playerRef.current = new window.YT.Player(videoPlayerRef.current, {
                width: '100%',
                height: '100%',
                videoId: currentVideo.extractedId,
                playerVars: {
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1,
                },
                events: {
                    onStateChange: (event: any) => {
                        // event.data === 0 means YT.PlayerState.ENDED
                        if (event.data === 0) {
                            playNext();
                        }
                    }
                }
            });
        }
        // If player already exists, just load the new video
        else if (playerRef.current && playerRef.current.loadVideoById) {
            playerRef.current.loadVideoById(currentVideo.extractedId);
        }
        // If YT API isn't loaded yet, wait for it
        else if (!playerRef.current && !window.YT) {
            // @ts-ignore
            window.onYouTubeIframeAPIReady = () => {
                if (videoPlayerRef.current && currentVideo) {
                    playerRef.current = new window.YT.Player(videoPlayerRef.current, {
                        width: '100%',
                        height: '100%',
                        videoId: currentVideo.extractedId,
                        playerVars: {
                            autoplay: 1,
                            rel: 0,
                            modestbranding: 1,
                        },
                        events: {
                            onStateChange: (event: any) => {
                                if (event.data === 0) {
                                    playNext();
                                }
                            }
                        }
                    });
                }
            };
        }
    }, [currentVideo?.extractedId, playVideo]);

    // Cleanup player on unmount
    useEffect(() => {
        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                }
                playerRef.current = null;
            }
        };
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/streams", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
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

            // If nothing is playing, immediately play the newly added song
            if (!currentVideo && playVideo) {
                // adding a slight delay ensures the DB finishes the create
                // before the next endpoint tries to pick it up
                setTimeout(() => {
                    playNext();
                }, 500);
            }
        } catch (e) {
            console.error("Error adding stream:", e);
        }
    };

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
        } catch (e) {
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
        <div className="flex flex-col min-h-screen bg-gray-950 text-gray-200">
            <Appbar />
            <div className="flex justify-center px-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5 w-full max-w-screen-xl pt-8 pb-8">
                    {/* Left Column: Upcoming Songs */}
                    <div className="col-span-3">
                        <div className="space-y-4 w-full">
                            <h2 className="text-2xl font-bold text-white">Upcoming Songs</h2>
                            <div className="space-y-2">
                                {queue.length === 0 ? (
                                    <Card className="bg-gray-900 border-gray-800">
                                        <CardContent className="p-4">
                                            <p className="text-center py-8 text-gray-400">No songs in queue. Add one above!</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    queue.map((video) => (
                                        <Card key={video.id} className="bg-gray-900 border-gray-800">
                                            <CardContent className="p-4 flex items-center space-x-4">
                                                <img
                                                    src={video.thumbnail}
                                                    alt={`Thumbnail for ${video.title}`}
                                                    className="w-30 h-20 object-cover rounded"
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white">{video.title}</h3>
                                                </div>
                                                <div>
                                                    <Button
                                                        onClick={() => handleVote(video.id, video.haveUpvoted ? false : true)}
                                                        className="flex items-center gap-2 bg-transparent border-gray-700 hover:bg-gray-800 text-white"
                                                    >
                                                        {video.haveUpvoted ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                                        <span>{video.upvotes}</span>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Creator Actions & Now Playing */}
                    <div className="col-span-2">
                        <div className="space-y-6 w-full">
                            {/* Header with Share Button */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Add a song</h2>
                                <Button
                                    onClick={handleShare}
                                    className="bg-purple-700 hover:bg-purple-800 text-white"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Add Song Form */}
                            <form onSubmit={handleSubmit} className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Paste YouTube link here"
                                    value={inputLink}
                                    onChange={(e) => setInputLink(e.target.value)}
                                    className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 h-12"
                                />
                                <Button disabled={loading} type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white h-12">
                                    {loading ? "Loading..." : "Add to Queue"}
                                </Button>
                            </form>

                            {/* Preview Card */}
                            {inputLink && inputLink.match(YT_REGEX) && !loading && (
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardContent className="p-4">
                                        <LiteYouTubeEmbed title="" id={inputLink.match(YT_REGEX)?.[1] ?? ""} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Now Playing */}
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardContent className="p-4">
                                        {currentVideo ? (
                                            <>
                                                {playVideo ? (
                                                    <>
                                                        <div className="w-full aspect-video rounded overflow-hidden">
                                                            <div ref={videoPlayerRef} />
                                                        </div>
                                                        <p className="text-center font-semibold text-white mt-3">{currentVideo.title}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <img
                                                            src={currentVideo.bigImg}
                                                            alt={currentVideo.title}
                                                            className="w-full aspect-video object-cover rounded"
                                                        />
                                                        <p className="text-center font-semibold text-white mt-3">{currentVideo.title}</p>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-center py-8 text-gray-400">No video playing</p>
                                        )}
                                    </CardContent>
                                </Card>
                                {playVideo && (
                                    <Button
                                        disabled={playNextLoader}
                                        onClick={playNext}
                                        className="w-full bg-purple-700 hover:bg-purple-800 text-white h-12"
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        {playNextLoader ? "Loading..." : "Play Next"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}