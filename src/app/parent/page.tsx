export default function ParentDashboard() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Parent Dashboard</h1>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                    Add Child Profile
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 font-medium mb-1">Screen Time</h3>
                    <p className="text-3xl font-bold text-brand-primary">2h 15m</p>
                    <p className="text-xs text-green-500 mt-2">Within daily limit</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 font-medium mb-1">Mood Status</h3>
                    <p className="text-3xl font-bold text-brand-secondary">Happy</p>
                    <p className="text-xs text-slate-400 mt-2">Based on recent chats</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 font-medium mb-1">Safety Alerts</h3>
                    <p className="text-3xl font-bold text-brand-accent">0</p>
                    <p className="text-xs text-slate-400 mt-2">Everything looks good</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                        <div>
                            <p className="font-medium text-slate-700">Chatted about Space</p>
                            <p className="text-sm text-slate-400">10 mins ago</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-brand-secondary"></div>
                        <div>
                            <p className="font-medium text-slate-700">Played "Math Quiz"</p>
                            <p className="text-sm text-slate-400">1 hour ago</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
