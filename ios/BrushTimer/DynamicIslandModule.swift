import Foundation
import ActivityKit
import React

@available(iOS 16.1, *)
struct BrushingActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var subtitle: String
    var endDate: Date
  }

  var title: String
}

@objc(DynamicIslandModule)
class DynamicIslandModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(startBrushingActivity:subtitle:minutes:resolver:rejecter:)
  func startBrushingActivity(
    _ title: String,
    subtitle: String,
    minutes: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolve(nil)
      return
    }

    Task {
      do {
        let clampedMinutes = max(1, minutes.intValue)
        let attributes = BrushingActivityAttributes(title: title)
        let state = BrushingActivityAttributes.ContentState(
          subtitle: subtitle,
          endDate: Date().addingTimeInterval(TimeInterval(clampedMinutes * 60))
        )
        if let existing = Activity<BrushingActivityAttributes>.activities.first {
          await existing.end(dismissalPolicy: .immediate)
        }
        if #available(iOS 16.2, *) {
          _ = try Activity<BrushingActivityAttributes>.request(
            attributes: attributes,
            content: ActivityContent(state: state, staleDate: state.endDate),
            pushType: nil
          )
        } else {
          _ = try Activity<BrushingActivityAttributes>.request(
            attributes: attributes,
            contentState: state,
            pushType: nil
          )
        }
        resolve(nil)
      } catch {
        resolve(nil)
      }
    }
  }

  @objc(endBrushingActivity:rejecter:)
  func endBrushingActivity(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolve(nil)
      return
    }
    Task {
      for activity in Activity<BrushingActivityAttributes>.activities {
        await activity.end(dismissalPolicy: .immediate)
      }
      resolve(nil)
    }
  }
}

