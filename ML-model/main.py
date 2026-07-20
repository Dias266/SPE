import os
import subprocess
import re

MODEL_FILE = "AdaBoostM1-DecisionStump-base-classifier.model"
DATA_FILE = "data.arff"
DEFAULT_JAR_FILE = "weka.jar"
TEMPLATE_FILE = "training_template.arff"
LOG_FILE = "final_predictions_log.txt"  # File where results will be saved

CLASSIFIER_CLASS = "weka.classifiers.meta.AdaBoostM1"

def locate_project_file(filename):
    if os.path.exists(filename):
        return filename
    parent_path = os.path.join("..", filename)
    if os.path.exists(parent_path):
        return parent_path
    return None

def extract_selected_instance():
    template_path = locate_project_file(TEMPLATE_FILE)
    if not template_path:
        print(f"❌ Error: Cannot find template file '{TEMPLATE_FILE}'.")
        return None, None, None

    header_lines = []
    data_lines = []
    in_data_section = False

    with open(template_path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if not stripped:
                if not in_data_section:
                    header_lines.append(line)
                continue
                
            if stripped.lower().startswith("@data"):
                in_data_section = True
                header_lines.append(line)
                continue

            if in_data_section:
                if not stripped.startswith("%"):
                    data_lines.append(stripped)
            else:
                header_lines.append(line)

    if not data_lines:
        print("❌ Error: The template contains no data rows.")
        return None, None, None

    total_instances = len(data_lines)
    print(f"📋 Found template data! There are {total_instances} total instances available.")
    
    while True:
        try:
            choice = input(f"➔ Enter the instance number you want to predict (1 to {total_instances}): ").strip()
            idx = int(choice) - 1
            if 0 <= idx < total_instances:
                target_instance = data_lines[idx]
                break
            else:
                print(f"⚠️ Invalid number. Pick a number between 1 and {total_instances}.")
        except ValueError:
            print("⚠️ Please enter a valid whole number.")

    parts = target_instance.split(",")
    if parts:
        original_class = parts.pop().strip()
        new_data_row = ",".join(parts) + ",?"
        return "".join(header_lines), new_data_row, choice

    return None, None, None

def main():
    print("=== Interactive Weka Predictor with 70% Filter ===")
    
    header, test_row, instance_num = extract_selected_instance()
    if not header or not test_row:
        return
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(header + "\n" + test_row + "\n")
        
    print("\nProcessing instance through AdaBoost engine...")
    
    active_jar = locate_project_file(DEFAULT_JAR_FILE)
    active_model = locate_project_file(MODEL_FILE)

    if not active_jar or not active_model:
        print("❌ Error: Missing execution dependency components.")
        return

    command = ["java", "-cp", active_jar, CLASSIFIER_CLASS, "-l", active_model, "-T", DATA_FILE, "-p", "0"]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        raw_output = result.stdout.strip()
        
        if raw_output:
            lines = raw_output.split("\n")
            weka_prediction = None
            raw_confidence = 0.0
            
            for line in lines:
                match = re.match(r"^\s*(\d+)\s+\S+\s+(\S+)\s+(\S+)", line)
                if match:
                    weka_prediction = match.group(2)
                    raw_confidence = float(match.group(3))
                    if ":" in weka_prediction:
                        weka_prediction = weka_prediction.split(":")[-1]
                    break
            
            if weka_prediction is not None:
                confidence_percentage = raw_confidence * 100
                print("\n--- 📊 Analysis Results ---")
                print(f"Weka Raw Prediction: {weka_prediction}")
                print(f"Model Confidence: {confidence_percentage:.1f}%")
                
                # --- APPLY CUSTOM 70% THRESHOLD LOGIC ---
                if weka_prediction == "1" and confidence_percentage < 70.0:
                    final_class = "0"
                    explanation = "Maintenance 0 (No Maintenance Needed) - Reason: Confidence was lower than 70%"
                elif weka_prediction == "1" and confidence_percentage >= 70.0:
                    final_class = "1"
                    explanation = "Maintenance 1 (Needs Maintenance) - Reason: High confidence prediction"
                else:
                    # If Weka natively predicted 0, keep it as 0
                    final_class = weka_prediction
                    explanation = f"Maintenance {weka_prediction} - Reason: Native model decision"

                print(f"\n🔮 Final Filtered Decision: {explanation}")
                print("--------------------------------")
                
                # --- SAVE THE RESULT TO A TXT FILE ---
                log_entry = (
                    f"Instance Number: {instance_num}\n"
                    f"Weka Raw Prediction: {weka_prediction}\n"
                    f"Model Confidence: {confidence_percentage:.1f}%\n"
                    f"Final Adjusted Decision: {explanation}\n"
                    f"{'='*40}\n"
                )
                
                with open(LOG_FILE, "a", encoding="utf-8") as log_f:
                    log_f.write(log_entry)
                
                print(f"🎉 Results successfully appended to file: {LOG_FILE}\n")
            else:
                print("\n❌ Weka returned headers but did not output a prediction string.")
        else:
            print("\n❌ Weka engine returned blank output.")
            
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Execution Error:\n{e.stderr}")

if __name__ == "__main__":
    main()
