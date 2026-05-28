import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { FileText, ChevronRight, Download, Share2 } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInRight,
  Layout,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

/**
 * Mock Data for Receipts (in production, fetch from Supabase)
 */
const MOCK_RECEIPTS = [
  {
    id: "1",
    receipt_number: "VT-B1C8E440",
    amount: 56.0,
    currency: "KSH",
    description: "Secure Transfer",
    date: "May 28, 2026",
    method: "Vault",
  },
  {
    id: "2",
    receipt_number: "VT-D4E5F6A7",
    amount: 420.0,
    currency: "USD",
    description: "P2P Transfer to Aisha",
    date: "May 27, 2026",
    method: "Vault",
  },
];

export default function ReceiptHistoryScreen() {
  const [selectedReceipt, setSelectedReceipt] = React.useState<any>(null);

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_RECEIPTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <ReceiptItem
            item={item}
            index={index}
            onPress={() => setSelectedReceipt(item)}
          />
        )}
      />

      {selectedReceipt && (
        <ReceiptDetailOverlay
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </View>
  );
}

function ReceiptItem({ item, index, onPress }: any) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 100)} layout={Layout.springify()}>
      <TouchableOpacity style={styles.receiptCard} onPress={onPress}>
        <View style={styles.receiptIconContainer}>
          <FileText size={20} color="#64748B" />
        </View>
        <View style={styles.receiptInfo}>
          <Text style={styles.receiptDescription}>{item.description}</Text>
          <Text style={styles.receiptMeta}>{item.receipt_number}</Text>
        </View>
        <View style={styles.receiptRight}>
          <Text style={styles.receiptAmount}>{item.currency} {item.amount.toLocaleString()}</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ReceiptDetailOverlay({ receipt, onClose }: any) {
  const translateY = useSharedValue(height);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    translateY.value = withTiming(height, { duration: 300 }, () => {
      // Logic to actually unmount would go here in a real navigation setup
    });
    setTimeout(onClose, 300);
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.overlayCloseArea} onPress={handleClose} />
      <Animated.View style={[styles.detailSheet, animatedStyle]}>
        <View style={styles.dragIndicator} />
        
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>Digital Receipt</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.circleAction}><Download size={20} color="#004D2C" /></TouchableOpacity>
            <TouchableOpacity style={styles.circleAction}><Share2 size={20} color="#004D2C" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.paperReceipt}>
          <View style={styles.receiptTopEdge} />
          
          <View style={styles.receiptContent}>
            <View style={styles.vaultLogoSmall}>
              <View style={styles.vLogo} />
              <Text style={styles.vaultBrand}>VAULT OS</Text>
            </View>

            <View style={styles.dividerDashed} />

            <View style={styles.receiptSection}>
              <Text style={styles.sectionLabel}>Amount Deducted</Text>
              <Text style={styles.sectionValueMain}>{receipt.currency} {receipt.amount.toLocaleString()}</Text>
            </View>

            <View style={styles.receiptGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Date</Text>
                <Text style={styles.gridValue}>{receipt.date}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Status</Text>
                <Text style={[styles.gridValue, { color: '#10B981' }]}>Completed</Text>
              </View>
            </View>

            <View style={styles.receiptSection}>
              <Text style={styles.sectionLabel}>Transaction ID</Text>
              <Text style={styles.sectionValueMono}>{receipt.receipt_number}</Text>
            </View>

            <View style={styles.securityMessage}>
               <Text style={styles.securityText}>
                 Your transfer of {receipt.currency} {receipt.amount.toLocaleString()} has been processed securely.
               </Text>
            </View>

            <View style={styles.dividerDashed} />

            <View style={styles.qrPlaceholder}>
               <View style={styles.qrBox} />
               <Text style={styles.qrText}>Verified by Vault Ledger</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContent: {
    padding: 20,
  },
  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  receiptIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  receiptDescription: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  receiptMeta: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  receiptRight: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004D2C",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
  },
  overlayCloseArea: {
    flex: 1,
  },
  detailSheet: {
    height: height * 0.85,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  circleAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  paperReceipt: {
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptTopEdge: {
    height: 6,
    backgroundColor: "#004D2C",
    opacity: 0.8,
  },
  receiptContent: {
    padding: 24,
  },
  vaultLogoSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  vLogo: {
    width: 24,
    height: 24,
    backgroundColor: "#004D2C",
    borderRadius: 6,
  },
  vaultBrand: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#004D2C",
  },
  dividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 20,
  },
  receiptSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionValueMain: {
    fontSize: 36,
    fontWeight: "900",
    color: "#004D2C",
  },
  sectionValueMono: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  receiptGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  securityMessage: {
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: 20,
  },
  securityText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  qrPlaceholder: {
    alignItems: "center",
    marginTop: 10,
  },
  qrBox: {
    width: 80,
    height: 80,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  qrText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#004D2C",
    height: 56,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
