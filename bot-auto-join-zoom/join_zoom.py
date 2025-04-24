import time
import os
import pyautogui
import subprocess

def start_zoom_meeting(meeting_id, meeting_pass):
    ZOOM_PATH = os.path.expandvars(r"%APPDATA%\Zoom\bin\Zoom.exe")

    if not os.path.exists(ZOOM_PATH):
        print("❌ Zoom application not found! Please check the installation path.")
        return

    if not os.path.exists("join_button.png") or not os.path.exists("join_meeting_button.png"):
        print("❌ Required button images not found. Please place 'join_button.png' and 'join_meeting_button.png' in the directory.")
        return

    print("🚀 Opening Zoom...")
    subprocess.Popen(ZOOM_PATH)
    time.sleep(7)

    print("🔍 Searching for 'Join' button...")
    join_button = None
    for confidence in [0.7, 0.6, 0.5]:
        try:
            join_button = pyautogui.locateCenterOnScreen("join_button.png", confidence=confidence)
            if join_button:
                print(f"✅ 'Join' button found with confidence {confidence}")
                pyautogui.click(join_button)
                break
        except:
            pass
        time.sleep(1)

    if not join_button:
        print("⚠️ 'Join' button not found! Trying keyboard navigation...")
        pyautogui.press("tab", presses=5, interval=0.3)
        pyautogui.press("enter")

    time.sleep(2)

    print("⌨️ Entering Meeting ID...")
    pyautogui.write(meeting_id)
    pyautogui.press("enter")
    time.sleep(5)

    if meeting_pass:
        print("🔑 Entering Password...")
        pyautogui.write(meeting_pass)
        pyautogui.press("enter")

    time.sleep(3)
    print("🔍 Searching for final 'Join' button (Zoom Preview)...")
    join_meeting_button = None
    for confidence in [0.8, 0.7, 0.6]:
        try:
            join_meeting_button = pyautogui.locateCenterOnScreen("join_meeting_button.png", confidence=confidence)
            if join_meeting_button:
                print(f"✅ Preview 'Join' button found with confidence {confidence}")
                pyautogui.moveTo(join_meeting_button.x, join_meeting_button.y, duration=0.5)
                pyautogui.click()
                time.sleep(3)
                break
        except Exception as e:
            print(f"🔍 Error locating button: {e}")
        time.sleep(1)

    if not join_meeting_button:
        print("⚠️ Preview 'Join' button not found! Trying keyboard fallback...")
        pyautogui.press("tab", presses=5, interval=0.3)
        pyautogui.press("enter")

    print("✅ Fully joined Zoom meeting!")

