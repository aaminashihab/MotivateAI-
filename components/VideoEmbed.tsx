export default function VideoEmbed({ videoId, title }: { videoId: string, title: string }) {
  if (!videoId) return null;

  return (
    <div className="glass-panel mt-8">
      <h2 className="text-2xl font-bold mb-1">Learning Resource</h2>
      <p className="text-slate-400 text-sm md:text-base mb-4">{title}</p>
      <div className="video-container relative w-full pt-[56.25%] rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-black/20">
        <iframe
          className="absolute top-0 left-0 w-full h-full border-none"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <div className="mt-4 bg-blue-900/20 border border-blue-500/20 text-blue-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
        💡 Coach Note: You do not need to finish this entire video. Use it as a reference, scrub to the relevant parts, and focus on your active task!
      </div>
    </div>
  );
}
