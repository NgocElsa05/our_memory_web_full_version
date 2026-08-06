import WidgetKit
import SwiftUI

struct CoupleEntry: TimelineEntry {
    let date: Date
    let days: Int
    let nickname1: String
    let nickname2: String
    let spaceName: String
    let avatar1: UIImage?
    let avatar2: UIImage?
}

struct CoupleProvider: TimelineProvider {
    func placeholder(in context: Context) -> CoupleEntry {
        CoupleEntry(
            date: Date(),
            days: 100,
            nickname1: "Em",
            nickname2: "Anh",
            spaceName: "Our Memory",
            avatar1: nil,
            avatar2: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CoupleEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CoupleEntry>) -> Void) {
        let entry = makeEntry()
        // Cập nhật lại sau nửa đêm hôm sau (~00:05)
        var comps = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        comps.day = (comps.day ?? 1) + 1
        comps.hour = 0
        comps.minute = 5
        let next = Calendar.current.date(from: comps) ?? Date().addingTimeInterval(3600 * 6)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func makeEntry() -> CoupleEntry {
        let snap = WidgetDataStore.load()
        return CoupleEntry(
            date: Date(),
            days: snap.computedDays,
            nickname1: snap.nickname1,
            nickname2: snap.nickname2,
            spaceName: snap.spaceName,
            avatar1: snap.avatar1Image,
            avatar2: snap.avatar2Image
        )
    }
}

struct OurMemoryWidgetEntryView: View {
    var entry: CoupleProvider.Entry

    var body: some View {
        HStack(spacing: 8) {
            avatarView(image: entry.avatar1, name: entry.nickname1)
            VStack(spacing: 2) {
                Text("\(entry.days)")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Text("ngày")
                    .font(.system(size: 10, weight: .bold))
                    .textCase(.uppercase)
                    .opacity(0.7)
            }
            .frame(maxWidth: .infinity)
            avatarView(image: entry.avatar2, name: entry.nickname2)
        }
        .padding(12)
        .containerBackground(for: .widget) {
            Color(red: 0.98, green: 0.97, blue: 0.99)
        }
        .widgetURL(URL(string: "ourmemory://home"))
    }

    @ViewBuilder
    private func avatarView(image: UIImage?, name: String) -> some View {
        ZStack {
            Circle()
                .fill(Color(red: 0.9, green: 0.88, blue: 0.95))
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .clipShape(Circle())
            } else {
                Text(String(name.prefix(1)).uppercased())
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(Color(red: 0.45, green: 0.5, blue: 0.75))
            }
        }
        .frame(width: 44, height: 44)
        .overlay(Circle().stroke(Color(red: 0.85, green: 0.7, blue: 0.8), lineWidth: 2))
    }
}

struct OurMemoryWidget: Widget {
    let kind: String = "OurMemoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CoupleProvider()) { entry in
            OurMemoryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Our Memory")
        .description("Hai bạn và số ngày yêu nhau.")
        .supportedFamilies([.systemSmall])
    }
}
