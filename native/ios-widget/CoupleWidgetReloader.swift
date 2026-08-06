import Foundation
import WidgetKit
import UIKit

/// Gọi từ SceneDelegate / AppDelegate khi app vào foreground — reload widget nếu cần.
enum CoupleWidgetReloader {
    static func reload() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
