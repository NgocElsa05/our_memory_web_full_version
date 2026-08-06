import Foundation
import UIKit

/// Đọc snapshot widget từ App Group (dùng chung App + Widget Extension).
enum WidgetDataStore {
    static let appGroupId = "group.com.ourmemory.app"
    static let defaultsKey = "couple_widget_snapshot"

    struct Snapshot {
        var togetherSince: String?
        var days: Int
        var nickname1: String
        var nickname2: String
        var spaceName: String
        var avatar1Image: UIImage?
        var avatar2Image: UIImage?
        var updatedAt: String?

        /// Tính lại số ngày từ togetherSince (giống web: +1 tính cả ngày đầu).
        var computedDays: Int {
            guard let raw = togetherSince, !raw.isEmpty else { return days }
            let parts = raw.split(separator: "-").compactMap { Int($0) }
            guard parts.count >= 3 else { return days }
            var comps = DateComponents()
            comps.year = parts[0]
            comps.month = parts[1]
            comps.day = parts[2]
            guard let start = Calendar.current.date(from: comps) else { return days }
            let startDay = Calendar.current.startOfDay(for: start)
            let today = Calendar.current.startOfDay(for: Date())
            let diff = Calendar.current.dateComponents([.day], from: startDay, to: today).day ?? 0
            return diff >= 0 ? diff + 1 : days
        }
    }

    static func load() -> Snapshot {
        let empty = Snapshot(
            togetherSince: nil,
            days: 0,
            nickname1: "User 1",
            nickname2: "User 2",
            spaceName: "Our Memory",
            avatar1Image: nil,
            avatar2Image: nil,
            updatedAt: nil
        )

        guard let defaults = UserDefaults(suiteName: appGroupId),
              let dict = defaults.dictionary(forKey: defaultsKey) else {
            return empty
        }

        let path1 = dict["avatar1Path"] as? String
        let path2 = dict["avatar2Path"] as? String

        return Snapshot(
            togetherSince: dict["togetherSince"] as? String,
            days: dict["days"] as? Int ?? 0,
            nickname1: dict["nickname1"] as? String ?? "User 1",
            nickname2: dict["nickname2"] as? String ?? "User 2",
            spaceName: dict["spaceName"] as? String ?? "Our Memory",
            avatar1Image: loadImage(path: path1),
            avatar2Image: loadImage(path: path2),
            updatedAt: dict["updatedAt"] as? String
        )
    }

    private static func loadImage(path: String?) -> UIImage? {
        guard let path = path, !path.isEmpty else { return nil }
        return UIImage(contentsOfFile: path)
    }
}
