import Foundation
import Capacitor
import WidgetKit

/// Capacitor plugin: JS `CoupleWidget.sync(payload)` → App Group + reload widget timelines.
/// Copy vào target App (ios/App/App/) và đăng ký theo IOS_WIDGET.md.
@objc(CoupleWidgetPlugin)
public class CoupleWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CoupleWidgetPlugin"
    public let jsName = "CoupleWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupId = "group.com.ourmemory.app"
    private let defaultsKey = "couple_widget_snapshot"

    @objc func sync(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            call.reject("App Group không mở được. Bật group.com.ourmemory.app cho App + Widget.")
            return
        }

        let togetherSince = call.getString("togetherSince")
        let days = call.getInt("days") ?? 0
        let avatar1Url = call.getString("avatar1Url") ?? ""
        let avatar2Url = call.getString("avatar2Url") ?? ""
        let nickname1 = call.getString("nickname1") ?? "User 1"
        let nickname2 = call.getString("nickname2") ?? "User 2"
        let spaceName = call.getString("spaceName") ?? "Our Memory"
        let updatedAt = call.getString("updatedAt") ?? ISO8601DateFormatter().string(from: Date())

        let group = DispatchGroup()
        var avatar1Path = ""
        var avatar2Path = ""

        group.enter()
        Self.cacheImage(urlString: avatar1Url, fileName: "avatar1.jpg", appGroupId: appGroupId) { path in
            avatar1Path = path ?? ""
            group.leave()
        }

        group.enter()
        Self.cacheImage(urlString: avatar2Url, fileName: "avatar2.jpg", appGroupId: appGroupId) { path in
            avatar2Path = path ?? ""
            group.leave()
        }

        group.notify(queue: .main) {
            let snapshot: [String: Any] = [
                "togetherSince": togetherSince as Any,
                "days": days,
                "avatar1Url": avatar1Url,
                "avatar2Url": avatar2Url,
                "avatar1Path": avatar1Path,
                "avatar2Path": avatar2Path,
                "nickname1": nickname1,
                "nickname2": nickname2,
                "spaceName": spaceName,
                "updatedAt": updatedAt
            ]

            defaults.set(snapshot, forKey: self.defaultsKey)
            defaults.synchronize()

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }

            call.resolve([
                "ok": true,
                "days": days,
                "avatar1Cached": !avatar1Path.isEmpty,
                "avatar2Cached": !avatar2Path.isEmpty
            ])
        }
    }

    private static func cacheImage(urlString: String, fileName: String, appGroupId: String, completion: @escaping (String?) -> Void) {
        guard let urlString = urlString as String?, !urlString.isEmpty, let url = URL(string: urlString) else {
            completion(nil)
            return
        }
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            completion(nil)
            return
        }

        let dest = container.appendingPathComponent(fileName)

        URLSession.shared.dataTask(with: url) { data, _, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }
            do {
                try data.write(to: dest, options: .atomic)
                completion(dest.path)
            } catch {
                completion(nil)
            }
        }.resume()
    }
}
