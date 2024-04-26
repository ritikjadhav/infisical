import { InputHTMLAttributes, useEffect, useState } from "react";
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as Popover from "@radix-ui/react-popover";
import { twMerge } from "tailwind-merge";

import { useWorkspace } from "@app/context";
import { useDebounce } from "@app/hooks";
import { useGetFoldersByEnv } from "@app/hooks/api";

import { Input } from "../Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  value?: string | null;
  isImport?: boolean;
  isVisible?: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  environment?: string;
  containerClassName?: string;
};

export const SecretPathInput = ({
  containerClassName,
  onChange,
  environment,
  value: propValue,
  ...props
}: Props) => {
  const [inputValue, setInputValue] = useState(propValue ?? "");
  const [secretPath, setSecretPath] = useState("/");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedInputValue = useDebounce(inputValue, 200);

  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id || "";
  const { folderNames: folders } = useGetFoldersByEnv({
    path: secretPath,
    environments: [environment || currentWorkspace?.environments?.[0].slug!],
    projectId: workspaceId
  });

  useEffect(() => {
    setInputValue(propValue ?? "/");
  }, [propValue]);

  useEffect(() => {
    if (environment) {
      setInputValue("/");
      setSecretPath("/");
      onChange?.({ target: { value: "/" } } as any);
    }
  }, [environment]);

  useEffect(() => {
    // update secret path if input is valid
    if (
      (debouncedInputValue.length > 0 &&
        debouncedInputValue[debouncedInputValue.length - 1] === "/") ||
      debouncedInputValue.length === 0
    ) {
      setSecretPath(debouncedInputValue);
    }

    // filter suggestions based on matching
    const searchFragment = debouncedInputValue.split("/").pop() || "";
    const filteredSuggestions = folders
      .filter((suggestionEntry) =>
        suggestionEntry.toUpperCase().startsWith(searchFragment.toUpperCase())
      )
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    setSuggestions(filteredSuggestions);
  }, [debouncedInputValue]);

  const handleSuggestionSelect = (selectedIndex: number) => {
    if (!suggestions[selectedIndex]) {
      return;
    }

    const validPaths = inputValue.split("/");
    validPaths.pop();

    const newValue = `${validPaths.join("/")}/${suggestions[selectedIndex]}`;
    onChange?.({ target: { value: newValue } } as any);
    setInputValue(newValue);
    setSecretPath(newValue);
    setHighlightedIndex(-1);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const mod = (n: number, m: number) => ((n % m) + m) % m;
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prevIndex) => mod(prevIndex + 1, suggestions.length));
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prevIndex) => mod(prevIndex - 1, suggestions.length));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      handleSuggestionSelect(highlightedIndex);
    }
    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: any) => {
    // propagate event to react-hook-form onChange
    if (onChange) {
      onChange(e);
    }

    setInputValue(e.target.value);
  };

  return (
    <Popover.Root
      open={suggestions.length > 0 && inputValue.length > 1}
      onOpenChange={() => {
        setHighlightedIndex(-1);
      }}
    >
      <Popover.Trigger asChild>
        <Input
          {...props}
          type="text"
          autoComplete="off"
          onKeyDown={handleKeyDown}
          value={inputValue}
          onChange={handleInputChange}
          className={containerClassName}
        />
      </Popover.Trigger>
      <Popover.Content
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={twMerge(
          "relative top-2 z-[100] overflow-hidden rounded-md border border-mineshaft-600 bg-mineshaft-900 font-inter text-bunker-100 shadow-md"
        )}
        style={{
          width: "var(--radix-popover-trigger-width)",
          maxHeight: "var(--radix-select-content-available-height)"
        }}
      >
        <div className="max-w-60 h-full w-full flex-col items-center justify-center rounded-md text-white">
          {suggestions.map((suggestion, i) => (
            <div
              tabIndex={0}
              role="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setHighlightedIndex(i);
                handleSuggestionSelect(i);
              }}
              style={{ pointerEvents: "auto" }}
              className="flex items-center justify-between border-mineshaft-600 text-left"
              key={`secret-reference-secret-${i + 1}`}
            >
              <div
                className={`${
                  highlightedIndex === i ? "bg-gray-600" : ""
                } text-md relative mb-0.5 flex w-full cursor-pointer select-none items-center justify-between rounded-md px-2 py-1 outline-none transition-all hover:bg-mineshaft-500 data-[highlighted]:bg-mineshaft-500`}
              >
                <div className="flex gap-2">
                  <div className="flex items-center text-yellow-700">
                    <FontAwesomeIcon icon={faFolder} />
                  </div>
                  <div className="text-md w-10/12 truncate text-left">{suggestion}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
