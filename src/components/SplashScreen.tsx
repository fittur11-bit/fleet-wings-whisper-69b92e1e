 import { motion, AnimatePresence } from "framer-motion";
 import { Plane } from "lucide-react";
 import { useEffect, useState } from "react";
 
 export function SplashScreen({ onFinish }: { onFinish: () => void }) {
   const [isVisible, setIsVisible] = useState(true);
 
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onFinish, 1200); // Wait for exit animation
      }, 4500);
      return () => clearTimeout(timer);
    }, [onFinish]);
 
   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
           initial={{ opacity: 1 }}
           exit={{ 
             opacity: 0,
             transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
           }}
           className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#17212B]"
         >
           <div className="relative flex flex-col items-center">
             {/* Animated Glow Effect */}
             <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ 
                 scale: [0.8, 1.2, 1],
                 opacity: [0, 0.5, 0.2],
               }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="absolute h-64 w-64 rounded-full bg-primary/20 blur-[80px]"
             />
 
             {/* Logo Icon Animation */}
             <motion.div
               initial={{ y: 20, opacity: 0, scale: 0.9 }}
               animate={{ y: 0, opacity: 1, scale: 1 }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="relative mb-6 flex h-24 w-24 items-center justify-center rounded border border-primary/20 bg-[#17212B]"
             >
               <motion.div
                 animate={{ 
                   y: [0, -5, 0],
                   rotate: [0, 2, -2, 0]
                 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               >
                 <Plane className="h-12 w-12 text-primary" strokeWidth={1.5} />
               </motion.div>
             </motion.div>
 
             {/* Text Animation */}
             <div className="text-center">
                <motion.h1
                  initial={{ y: 15, opacity: 0, filter: "blur(10px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                  className="font-sans text-5xl font-extrabold tracking-tight text-white sm:text-6xl"
                >
                  Flight<span className="text-primary">Core</span>
                </motion.h1>
               
               <motion.div 
                 initial={{ scaleX: 0 }}
                 animate={{ scaleX: 1 }}
                 transition={{ delay: 0.6, duration: 1, ease: "circOut" }}
                 className="mt-4 h-[1px] w-48 origin-center bg-gradient-to-r from-transparent via-primary/50 to-transparent"
               />
 
                <motion.p
                  initial={{ opacity: 0, letterSpacing: "0.1em" }}
                  animate={{ opacity: 1, letterSpacing: "0.25em" }}
                  transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                  className="mt-3 font-sans text-[10px] font-medium uppercase text-primary/60"
                >
                  Sistemas de Gestão Aeronáutica
                </motion.p>
             </div>
 
              {/* Loading Bar */}
              <div className="absolute -bottom-24 h-[2px] w-48 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    repeatDelay: 0.3
                  }}
                  className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
                />
              </div>
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }