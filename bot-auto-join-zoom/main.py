import threading
import join_zoom
import soham_bot
import time
import pyautogui

# Get inputs
# meeting_id = input("Enter Meeting ID: ")
meeting_id = "88450003597"
# meeting_pass = input("Enter Meeting Password (press Enter if none): ")
meeting_pass = "cn35wf"

# Function to start Soham Bot AFTER Zoom interface is detected
def delayed_start_bot():
    print("\n🔍 Waiting for Zoom meeting interface...")
    timeout = 30  # seconds
    start = time.time()
    while time.time() - start < timeout:
        try:
            found = pyautogui.locateOnScreen("zoom_meeting_interface.png", confidence=0.6)
            if found: 
                print("✅ Zoom meeting interface detected!")
                break
        except:
            pass
        time.sleep(1)
    else:
        print("❌ Zoom meeting interface not detected! Starting bot anyway...")

    soham_bot.setup_and_start_bot()
 # or setup_and_start_bot() if you rename it

# Threads
zoom_thread = threading.Thread(target=join_zoom.start_zoom_meeting, args=(meeting_id, meeting_pass))
bot_thread = threading.Thread(target=delayed_start_bot)

zoom_thread.start()
bot_thread.start()
